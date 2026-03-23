//! HTTP server for Y game bots.
//!
//! This module provides an Axum-based REST API for querying Y game bots.
//! The server exposes endpoints for checking bot status and requesting moves.
//!
//! # Endpoints
//! - `GET /status` - Health check endpoint
//! - `POST /{api_version}/ybot/choose/{bot_id}` - Request a move from a bot
//!
//! # Example
//! ```no_run
//! use gamey::run_bot_server;
//!
//! #[tokio::main]
//! async fn main() {
//!     if let Err(e) = run_bot_server(3000).await {
//!         eprintln!("Server error: {}", e);
//!     }
//! }
//! ```

pub mod choose;
pub mod error;
pub mod state;
pub mod version;
use axum::response::IntoResponse;
use std::sync::Arc;
pub use choose::MoveResponse;
pub use error::ErrorResponse;
pub use version::*;

use crate::{GameYError, YBotRegistry, state::AppState, create_all_bots};
use crate::bot::ybot::YBot;
use axum::extract::ws::{WebSocketUpgrade, WebSocket, Message};
use axum::{
    extract::State,
    Json,
};
use axum::routing::get;
use futures::{SinkExt, StreamExt};
use serde_json::json;

use serde::Serialize;

/// Creates the Axum router with the given state.
///
/// This is useful for testing the API without binding to a network port.
pub fn create_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/status", axum::routing::get(status))
        .route("/bots", axum::routing::get(list_bots))
        .route("/ws", axum::routing::get(ws_handler))
        .route(
            "/{api_version}/ybot/choose/{bot_id}",
            axum::routing::post(choose::choose),
        )
        .with_state(state)
}

/// Creates the default application state with the standard bot registry.
///
/// The default state includes all bots provided by the factory.
pub fn create_default_state() -> AppState {
    let bots = create_all_bots();
    AppState::new(bots)
}

/// Starts the bot server on the specified port.
///
/// This function blocks until the server is shut down.
///
/// # Arguments
/// * `port` - The TCP port to listen on
///
/// # Errors
/// Returns `GameYError::ServerError` if:
/// - The TCP port cannot be bound (e.g., port already in use, permission denied)
/// - The server encounters an error while running
pub async fn run_bot_server(port: u16) -> Result<(), GameYError> {
    let state = create_default_state();
    let app = create_router(state);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Failed to bind to {}: {}", addr, e),
        })?;

    println!("Server mode: Listening on http://{}", addr);
    axum::serve(listener, app)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Server error: {}", e),
        })?;

    Ok(())
}

/// Health check endpoint handler.
///
/// Returns "OK" to indicate the server is running.
pub async fn status() -> impl IntoResponse {
    "OK"
}

/// WebSocket upgrade handler. Spawns a session that manages a single game
/// instance per connection and exchanges JSON messages with the client.
#[axum::debug_handler]
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    use crate::core::game::GameY;
    use crate::core::coord::Coordinates;
    use crate::core::movement::Movement;
    use crate::core::player::PlayerId;
    use crate::notation::yen::YEN;
    use crate::RenderOptions;
    use crate::cli::{parse_command, Command};
    use crate::cli::Mode as CliMode;
    use crate::YBot;

    let mut game = GameY::new(7);
    let mut bot_id: Option<String> = None;
    let mut render_options = RenderOptions::default();
    let mut mode = CliMode::Human;
    let mut bot_opt: Option<std::sync::Arc<dyn YBot>> = None;

    while let Some(Ok(msg)) = socket.next().await {
        match msg {
            Message::Text(text) => {
                let v: serde_json::Value = match serde_json::from_str(&text) {
                    Ok(v) => v,
                    Err(_) => {
                        let _ = socket.send(Message::Text(json!({"type":"error","message":"invalid json"}).to_string().into())).await;
                        continue;
                    }
                };

                match v.get("type").and_then(|t| t.as_str()) {
                    Some("start") => {
                        let size = v.get("size").and_then(|s| s.as_u64()).unwrap_or(7) as u32;
                        bot_id = v.get("bot_id").and_then(|b| b.as_str()).map(|s| s.to_string());
                        game = GameY::new(size);
                        // configure mode and bot if requested
                        if let Some(ref bid) = bot_id {
                            if let Some(b) = state.bots().find(bid) {
                                mode = CliMode::Computer;
                                bot_opt = Some(b);
                            }
                        }
                        let yen: YEN = (&game).into();
                        let render = game.render(&render_options);
                        let _ = socket.send(Message::Text(json!({"type":"state","yen":yen, "render": render}).to_string().into())).await;
                    }
                    Some("move") => {
                        // keep backward compatibility: handle move with coords
                        if let (Some(player), Some(coords_v)) = (v.get("player").and_then(|p| p.as_u64()), v.get("coords")) {
                            if let Some(arr) = coords_v.as_array() {
                                if arr.len() == 3 {
                                    let x = arr[0].as_u64().unwrap_or(0) as u32;
                                    let y = arr[1].as_u64().unwrap_or(0) as u32;
                                    let z = arr[2].as_u64().unwrap_or(0) as u32;
                                    let coords = Coordinates::new(x, y, z);
                                    let movement = Movement::Placement {
                                        player: PlayerId::new(player as u32),
                                        coords,
                                    };
                                    if let Err(e) = game.add_move(movement) {
                                        let _ = socket.send(Message::Text(json!({"type":"error","message":format!("invalid move: {}", e)}).to_string().into())).await;
                                    } else {
                                        // after move, if in computer mode trigger bot
                                        if mode == CliMode::Computer {
                                            if !game.check_game_over() {
                                                if let Some(ref b) = bot_opt {
                                                    if let Some(bot_coords) = b.choose_move(&game) {
                                                        let bot_player = game.next_player().unwrap_or(PlayerId::new(1));
                                                        let bot_mv = Movement::Placement {
                                                            player: bot_player,
                                                            coords: bot_coords,
                                                        };
                                                        let _ = game.add_move(bot_mv);
                                                    }
                                                }
                                            }
                                        }

                                        let yen: YEN = (&game).into();
                                        let render = game.render(&render_options);
                                        let _ = socket.send(Message::Text(json!({"type":"state","yen":yen, "render": render}).to_string().into())).await;
                                    }
                                }
                            }
                        }
                    }
                    Some("command") => {
                        // New: accept CLI-like commands: {type:'command', line:'5'}
                        if let Some(line) = v.get("line").and_then(|l| l.as_str()) {
                            // determine current player
                            let player = game.next_player().unwrap_or(PlayerId::new(0));
                            // parse command
                            let cmd = parse_command(line, game.total_cells());
                            match cmd {
                                Command::Place { idx } => {
                                    let coords = Coordinates::from_index(idx, game.board_size());
                                    let movement = Movement::Placement { player, coords };
                                    if let Err(e) = game.add_move(movement) {
                                        let _ = socket.send(Message::Text(json!({"type":"error","message":format!("invalid move: {}", e)}).to_string().into())).await;
                                    } else if mode == CliMode::Computer {
                                        // bot reply
                                        if !game.check_game_over() {
                                            if let Some(ref b) = bot_opt {
                                                if let Some(bot_coords) = b.choose_move(&game) {
                                                    let bot_player = game.next_player().unwrap_or(PlayerId::new(1));
                                                    let bot_mv = Movement::Placement { player: bot_player, coords: bot_coords };
                                                    let _ = game.add_move(bot_mv);
                                                }
                                            }
                                        }
                                    }
                                }
                                Command::Resign => {
                                    let movement = Movement::Action { player, action: crate::GameAction::Resign };
                                    let _ = game.add_move(movement);
                                }
                                Command::Show3DCoords => { render_options.show_3d_coords = !render_options.show_3d_coords; }
                                Command::ShowIdx => { render_options.show_idx = !render_options.show_idx; }
                                Command::ShowColors => { render_options.show_colors = !render_options.show_colors; }
                                Command::Help => {
                                    let help_text = "Available commands: <number>, resign, show_coords, show_idx, show_colors, save <file>, load <file>, exit, help";
                                    let _ = socket.send(Message::Text(json!({"type":"help","text":help_text}).to_string().into())).await;
                                }
                                Command::Exit => {
                                    let _ = socket.send(Message::Text(json!({"type":"info","message":"closing"}).to_string().into())).await;
                                    let _ = socket.close().await;
                                    break;
                                }
                                Command::None => {}
                                Command::Error { message } => {
                                    let _ = socket.send(Message::Text(json!({"type":"error","message":message}).to_string().into())).await;
                                }
                                Command::Save { filename } => {
                                    let path = std::path::Path::new(&filename);
                                    if let Err(e) = game.save_to_file(path) { let _ = socket.send(Message::Text(json!({"type":"error","message":format!("save error: {}", e)}).to_string().into())).await; }
                                }
                                Command::Load { filename } => {
                                    let path = std::path::Path::new(&filename);
                                    match GameY::load_from_file(path) {
                                        Ok(g) => game = g,
                                        Err(e) => { let _ = socket.send(Message::Text(json!({"type":"error","message":format!("load error: {}", e)}).to_string().into())).await; }
                                    }
                                }
                            }
                            // after processing, always send updated state+render
                            let yen: YEN = (&game).into();
                            let render = game.render(&render_options);
                            let _ = socket.send(Message::Text(json!({"type":"state","yen":yen, "render": render}).to_string().into())).await;
                        }
                    }
                    Some(other) => {
                        let _ = socket.send(Message::Text(json!({"type":"error","message":format!("unknown message type: {}", other)}).to_string().into())).await;
                    }
                    None => {
                        let _ = socket.send(Message::Text(json!({"type":"error","message":"missing type"}).to_string().into())).await;
                    }
                }
            }
            Message::Binary(_) => {
                let _ = socket.send(Message::Text(json!({"type":"error","message":"binary not supported"}).to_string().into())).await;
            }
            Message::Close(_) => break,
            Message::Ping(_) | Message::Pong(_) => {}
        }
    }
}

#[derive(Serialize)]
pub struct BotInfo {
    pub name: String,
    pub difficulty: String,
    pub description: String,
}

pub async fn list_bots(
    State(state): State<AppState>,
) -> Json<Vec<BotInfo>> {

    let bots = state.bots().get_all_bots();

    let result: Vec<BotInfo> = bots
        .iter()
        .map(|bot| BotInfo {
            name: bot.name().to_string(),
            difficulty: bot.difficulty().to_string(),
            description: bot.description().to_string(),
        })
        .collect();

    Json(result)
}

