//! Servidor HTTP para bots del juego Y.
//!
//! Este módulo proporciona una API REST basada en Axum para interactuar con bots del juego Y.
//! Expone endpoints para comprobar el estado del servidor y solicitar movimientos a los bots.
//!
//! # Endpoints
//! - `GET /status` - Endpoint de comprobación de estado (health check)
//! - `POST /{api_version}/ybot/choose/{bot_id}` - Solicitar un movimiento a un bot
//!
//! # Ejemplo
//! ```no_run
//! use gamey::run_bot_server;
//!
//! #[tokio::main]
//! async fn main() {
//!     if let Err(e) = run_bot_server(3000).await {
//!         eprintln!("Error del servidor: {}", e);
//!     }
//! }
//! ```

// Submódulos que organizan la lógica del servidor
pub mod choose;   // Lógica para elegir movimientos de bots
pub mod error;    // Manejo de errores y respuestas de error
pub mod state;    // Estado compartido de la aplicación
pub mod version;  // Gestión de versiones de la API

use axum::response::IntoResponse;
use std::sync::Arc;

// Reexportación de tipos útiles
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

/// Crea el router de Axum con el estado proporcionado.
/// Útil para testing sin necesidad de abrir un puerto de red.
pub fn create_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/status", axum::routing::get(status)) // Endpoint de estado
        .route("/bots", axum::routing::get(list_bots)) // Lista de bots disponibles
        .route("/ws", axum::routing::get(ws_handler)) // Endpoint WebSocket
        .route(
            "/{api_version}/ybot/choose/{bot_id}",
            axum::routing::post(choose::choose), // Endpoint para pedir jugadas
        )
        .with_state(state) // Estado compartido
}

/// Crea el estado por defecto con todos los bots registrados.
pub fn create_default_state() -> AppState {
    let bots = create_all_bots(); // Construye todos los bots disponibles
    AppState::new(bots)
}

/// Inicia el servidor en el puerto especificado.
/// Bloquea hasta que el servidor se detiene.
pub async fn run_bot_server(port: u16) -> Result<(), GameYError> {
    let state = create_default_state();
    let app = create_router(state);

    let addr = format!("0.0.0.0:{}", port);

    // Intenta enlazar el puerto
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Error al enlazar {}: {}", addr, e),
        })?;

    println!("Servidor escuchando en http://{}", addr);

    // Ejecuta el servidor
    axum::serve(listener, app)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Error del servidor: {}", e),
        })?;

    Ok(())
}

/// Endpoint de health check.
/// Devuelve "OK" si el servidor está activo.
pub async fn status() -> impl IntoResponse {
    "OK"
}

/// Maneja la conexión WebSocket.
/// Crea una sesión por cliente.
#[axum::debug_handler]
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// Lógica principal de una conexión WebSocket.
/// Gestiona una partida por conexión.
async fn handle_socket(mut socket: WebSocket, state: AppState) {

    // Imports locales para lógica del juego
    use crate::core::game::GameY;
    use crate::core::coord::Coordinates;
    use crate::core::movement::Movement;
    use crate::core::player::PlayerId;
    use crate::notation::yen::YEN;
    use crate::RenderOptions;
    use crate::cli::{parse_command, Command};
    use crate::cli::Mode as CliMode;
    use crate::YBot;

    // Estado inicial de la partida
    let mut game = GameY::new(7);
    let mut bot_id: Option<String> = None;
    let mut render_options = RenderOptions::default();
    let mut mode = CliMode::Human;
    let mut bot_opt: Option<std::sync::Arc<dyn YBot>> = None;

    // Bucle principal de recepción de mensajes
    while let Some(Ok(msg)) = socket.next().await {
        match msg {

            // Mensajes de texto (JSON)
            Message::Text(text) => {

                // Parseo del JSON recibido
                let v: serde_json::Value = match serde_json::from_str(&text) {
                    Ok(v) => v,
                    Err(_) => {
                        // Error si JSON inválido
                        let _ = socket.send(Message::Text(json!({
                            "type":"error",
                            "message":"invalid json"
                        }).to_string().into())).await;
                        continue;
                    }
                };

                // Procesamiento según tipo de mensaje
                match v.get("type").and_then(|t| t.as_str()) {

                    // Inicializar partida
                    Some("start") => {
                        let size = v.get("size").and_then(|s| s.as_u64()).unwrap_or(7) as u32;
                        bot_id = v.get("bot_id").and_then(|b| b.as_str()).map(|s| s.to_string());

                        game = GameY::new(size);

                        // Configurar modo contra bot
                        if let Some(ref bid) = bot_id {
                            if let Some(b) = state.bots().find(bid) {
                                mode = CliMode::Computer;
                                bot_opt = Some(b);
                            }
                        }

                        // Enviar estado inicial
                        let yen: YEN = (&game).into();
                        let render = game.render(&render_options);

                        let _ = socket.send(Message::Text(json!({
                            "type":"state",
                            "yen":yen,
                            "render": render
                        }).to_string().into())).await;
                    }

                    // Movimiento manual
                    Some("move") => {
                        // Procesa coordenadas [x,y,z]
                        if let (Some(player), Some(coords_v)) =
                            (v.get("player").and_then(|p| p.as_u64()), v.get("coords"))
                        {
                            if let Some(arr) = coords_v.as_array() {
                                if arr.len() == 3 {

                                    let coords = Coordinates::new(
                                        arr[0].as_u64().unwrap_or(0) as u32,
                                        arr[1].as_u64().unwrap_or(0) as u32,
                                        arr[2].as_u64().unwrap_or(0) as u32,
                                    );

                                    let movement = Movement::Placement {
                                        player: PlayerId::new(player as u32),
                                        coords,
                                    };

                                    // Aplica el movimiento
                                    if let Err(e) = game.add_move(movement) {
                                        let _ = socket.send(Message::Text(json!({
                                            "type":"error",
                                            "message":format!("invalid move: {}", e)
                                        }).to_string().into())).await;
                                    } else {

                                        // Turno del bot si aplica
                                        if mode == CliMode::Computer && !game.check_game_over() {
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

                                        // Enviar estado actualizado
                                        let yen: YEN = (&game).into();
                                        let render = game.render(&render_options);

                                        let _ = socket.send(Message::Text(json!({
                                            "type":"state",
                                            "yen":yen,
                                            "render": render
                                        }).to_string().into())).await;
                                    }
                                }
                            }
                        }
                    }

                    // Comandos tipo CLI (texto)
                    Some("command") => {
                        if let Some(line) = v.get("line").and_then(|l| l.as_str()) {

                            let player = game.next_player().unwrap_or(PlayerId::new(0));
                            let cmd = parse_command(line, game.total_cells());

                            match cmd {
                                Command::Place { idx } => {
                                    let coords = Coordinates::from_index(idx, game.board_size());
                                    let movement = Movement::Placement { player, coords };
                                    let _ = game.add_move(movement);
                                }
                                Command::Resign => {
                                    let movement = Movement::Action {
                                        player,
                                        action: crate::GameAction::Resign
                                    };
                                    let _ = game.add_move(movement);
                                }
                                Command::Help => {
                                    let _ = socket.send(Message::Text(json!({
                                        "type":"help",
                                        "text":"Comandos disponibles: ..."
                                    }).to_string().into())).await;
                                }
                                Command::Exit => {
                                    let _ = socket.close().await;
                                    break;
                                }
                                _ => {}
                            }

                            // Enviar estado tras comando
                            let yen: YEN = (&game).into();
                            let render = game.render(&render_options);

                            let _ = socket.send(Message::Text(json!({
                                "type":"state",
                                "yen":yen,
                                "render": render
                            }).to_string().into())).await;
                        }
                    }

                    // Tipo desconocido
                    Some(other) => {
                        let _ = socket.send(Message::Text(json!({
                            "type":"error",
                            "message":format!("unknown message type: {}", other)
                        }).to_string().into())).await;
                    }

                    None => {
                        let _ = socket.send(Message::Text(json!({
                            "type":"error",
                            "message":"missing type"
                        }).to_string().into())).await;
                    }
                }
            }

            // Mensajes binarios no soportados
            Message::Binary(_) => {
                let _ = socket.send(Message::Text(json!({
                    "type":"error",
                    "message":"binary not supported"
                }).to_string().into())).await;
            }

            Message::Close(_) => break,
            Message::Ping(_) | Message::Pong(_) => {}
        }
    }
}

/// Información pública de un bot
#[derive(Serialize)]
pub struct BotInfo {
    pub name: String,
    pub difficulty: String,
    pub description: String,
}

/// Endpoint que devuelve la lista de bots disponibles
pub async fn list_bots(
    State(state): State<AppState>,
) -> Json<Vec<BotInfo>> {

    let bots = state.bots().get_all_bots();

    // Transforma bots en respuesta JSON
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