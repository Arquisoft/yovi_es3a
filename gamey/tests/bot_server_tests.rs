use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use gamey::{YBotRegistry, YEN, create_default_state, create_router, state::AppState, RandomBot, MoveResponse, ErrorResponse};
use futures::{SinkExt, StreamExt};

#[tokio::test]
async fn test_create_default_state_registers_all_expected_bots() {
    let state = create_default_state();
    let mut names = state.bots().names();
    names.sort();

    assert_eq!(state.bots().count(), 5);
    assert_eq!(
        names,
        vec![
            "greedy_easy".to_string(),
            "greedy_hard".to_string(),
            "greedy_medium".to_string(),
            "random_bot".to_string(),
            "random_strategy_bot".to_string(),
        ]
    );
}

#[tokio::test]
async fn test_list_bots_returns_catalog_of_registered_bots() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/bots")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let mut bots: Vec<BotInfoView> = serde_json::from_slice(&body).unwrap();
    bots.sort_by(|a, b| a.name.cmp(&b.name));

    assert_eq!(bots.len(), 5);
    assert_eq!(bots[0].name, "greedy_easy");
    assert_eq!(bots[0].difficulty, "Fácil");
    assert_eq!(bots[0].description, "Bot codicioso básico que elige la primera opción disponible.");

    assert_eq!(bots[1].name, "greedy_hard");
    assert_eq!(bots[1].difficulty, "Difícil");
    assert_eq!(bots[1].description, "Bot que intenta ganar o bloquear.");

    assert_eq!(bots[2].name, "greedy_medium");
    assert_eq!(bots[2].difficulty, "Media");
    assert_eq!(bots[2].description, "Bot que intenta ganar si puede.");

    assert_eq!(bots[3].name, "random_bot");
    assert_eq!(bots[3].difficulty, "Fácil");
    assert_eq!(bots[3].description, "Elige una casilla libre al azar en el tablero.");

    assert_eq!(bots[4].name, "random_strategy_bot");
    assert_eq!(bots[4].difficulty, "Variable");
    assert_eq!(bots[4].description, "Selecciona una estrategia diferente al azar para cada movimiento.");
}

#[tokio::test]
async fn test_list_bots_returns_empty_array_for_empty_registry() {
    let state = AppState::new(YBotRegistry::new());
    let app = test_app_with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/bots")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let bots: Vec<BotInfoView> = serde_json::from_slice(&body).unwrap();
    assert!(bots.is_empty());
}

#[tokio::test]
async fn test_post_on_bots_endpoint_returns_method_not_allowed() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/bots")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn test_websocket_session_covers_start_move_help_resign_and_error_paths() {
    let (addr, handle) = spawn_ws_server(create_default_state()).await;
    let url = format!("ws://{}/ws", addr);
    let (mut ws, _) = connect_async(&url).await.unwrap();

    ws.send(WsMessage::Text(
        serde_json::json!({
            "type": "start",
            "size": 3,
            "bot_id": "random_bot"
        })
        .to_string()
        .into(),
    ))
    .await
    .unwrap();

    let start_state = recv_ws_json(&mut ws).await;
    assert_eq!(start_state["type"], "state");
    assert_eq!(start_state["status"]["Ongoing"]["next_player"]["id"], 0);

    ws.send(WsMessage::Text(
        serde_json::json!({
            "type": "command",
            "line": "help"
        })
        .to_string()
        .into(),
    ))
    .await
    .unwrap();

    let help = recv_ws_json(&mut ws).await;
    assert_eq!(help["type"], "help");
    assert!(help["text"].as_str().unwrap().contains("Comandos disponibles"));

    ws.send(WsMessage::Text(
        serde_json::json!({
            "type": "move",
            "player": 0,
            "coords": [0, 1, 1]
        })
        .to_string()
        .into(),
    ))
    .await
    .unwrap();

    let after_move = recv_ws_json(&mut ws).await;
    assert_eq!(after_move["type"], "state");

    ws.send(WsMessage::Text(
        serde_json::json!({
            "type": "command",
            "line": "resign"
        })
        .to_string()
        .into(),
    ))
    .await
    .unwrap();

    let resign = recv_ws_json(&mut ws).await;
    assert_eq!(resign["type"], "state");
    assert_eq!(resign["status"]["Finished"]["winner"]["id"], 1);

    ws.send(WsMessage::Text("{ invalid json }".to_string().into()))
        .await
        .unwrap();

    let invalid_json = recv_ws_json(&mut ws).await;
    assert_eq!(invalid_json["type"], "error");
    assert_eq!(invalid_json["message"], "invalid json");

    ws.send(WsMessage::Text(
        serde_json::json!({"type": "command", "line": "help"})
            .to_string()
            .into(),
    ))
    .await
    .unwrap();

    let finished_error = recv_ws_json(&mut ws).await;
    assert_eq!(finished_error["type"], "error");
    assert!(finished_error["message"]
        .as_str()
        .unwrap()
        .contains("Game is already finished"));

    ws.send(WsMessage::Text(
        serde_json::json!({"type": "bogus"}).to_string().into(),
    ))
    .await
    .unwrap();

    let unknown = recv_ws_json(&mut ws).await;
    assert_eq!(unknown["type"], "error");
    assert!(unknown["message"]
        .as_str()
        .unwrap()
        .contains("unknown message type"));

    ws.send(WsMessage::Binary(vec![1, 2, 3].into())).await.unwrap();
    let binary = recv_ws_json(&mut ws).await;
    assert_eq!(binary["type"], "error");
    assert!(binary["message"].as_str().unwrap().contains("binary not supported"));

    let _ = ws.close(None).await;
    handle.abort();
}

#[tokio::test]
async fn test_websocket_exit_command_closes_connection() {
    let (addr, handle) = spawn_ws_server(create_default_state()).await;
    let url = format!("ws://{}/ws", addr);
    let (mut ws, _) = connect_async(&url).await.unwrap();

    ws.send(WsMessage::Text(
        serde_json::json!({
            "type": "start",
            "size": 3
        })
        .to_string()
        .into(),
    ))
    .await
    .unwrap();

    let _ = recv_ws_json(&mut ws).await;

    ws.send(WsMessage::Text(
        serde_json::json!({
            "type": "command",
            "line": "exit"
        })
        .to_string()
        .into(),
    ))
    .await
    .unwrap();

    let close_msg = timeout(Duration::from_secs(2), ws.next()).await.unwrap().unwrap().unwrap();
    assert!(matches!(close_msg, WsMessage::Close(_)));
    handle.abort();
}
use http_body_util::BodyExt;
use serde::Deserialize;
use std::sync::Arc;
use tower::ServiceExt;
use tokio::time::{timeout, Duration};
use tokio_tungstenite::{connect_async, tungstenite::Message as WsMessage};

/// Helper to create a test app with the default state
fn test_app() -> axum::Router {
    create_router(create_default_state())
}

/// Helper to create a test app with a custom state
fn test_app_with_state(state: AppState) -> axum::Router {
    create_router(state)
}

#[derive(Debug, Deserialize)]
struct BotInfoView {
    name: String,
    difficulty: String,
    description: String,
}

async fn spawn_ws_server(state: AppState) -> (std::net::SocketAddr, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let app = create_router(state);

    let handle = tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });

    (addr, handle)
}

async fn recv_ws_json(
    ws: &mut (impl StreamExt<Item = Result<WsMessage, tokio_tungstenite::tungstenite::Error>> + Unpin),
) -> serde_json::Value {
    let msg = timeout(Duration::from_secs(5), ws.next()).await.unwrap().unwrap().unwrap();
    match msg {
        WsMessage::Text(text) => serde_json::from_str(text.as_ref()).unwrap(),
        other => panic!("expected text websocket message, got {:?}", other),
    }
}

// ============================================================================
// Status endpoint tests
// ============================================================================

#[tokio::test]
async fn test_status_endpoint_returns_ok() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"OK");
}

// ============================================================================
// Choose endpoint tests - Success cases
// ============================================================================

#[tokio::test]
async fn test_choose_endpoint_with_valid_request() {
    let app = test_app();

    // Create a valid YEN (Y-game Exchange Notation) for a size 3 board
    // Layout: empty board with 3 rows (size 3): row1=1cell, row2=2cells, row3=3cells
    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let move_response: MoveResponse = serde_json::from_slice(&body).unwrap();

    assert_eq!(move_response.api_version, "v1");
    assert_eq!(move_response.bot_id, "random_bot");
    // Coordinates should be valid (we can't predict exactly which one the random bot picks)
}

#[tokio::test]
async fn test_choose_endpoint_with_partially_filled_board() {
    let app = test_app();

    // Board with some cells already filled: B in first cell, R in second
    let yen = YEN::new(3, 2, vec!['B', 'R'], "B/R./.B.".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let move_response: MoveResponse = serde_json::from_slice(&body).unwrap();

    assert_eq!(move_response.api_version, "v1");
    assert_eq!(move_response.bot_id, "random_bot");
}

// ============================================================================
// Choose endpoint tests - Error cases
// ============================================================================

#[tokio::test]
async fn test_choose_endpoint_with_invalid_api_version() {
    let app = test_app();

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v2/ybot/choose/random_bot") // v2 is not supported
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK); // Axum returns 200 with error JSON

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body).unwrap();

    assert!(error_response.message.contains("Unsupported API version"));
    assert_eq!(error_response.api_version, Some("v2".to_string()));
}

#[tokio::test]
async fn test_choose_endpoint_with_unknown_bot() {
    let app = test_app();

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/unknown_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body).unwrap();

    assert!(error_response.message.contains("Bot not found"));
    assert!(error_response.message.contains("unknown_bot"));
    assert_eq!(error_response.bot_id, Some("unknown_bot".to_string()));
}

#[tokio::test]
async fn test_choose_endpoint_with_invalid_json() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from("{ invalid json }"))
                .unwrap(),
        )
        .await
        .unwrap();

    // Invalid JSON should return a 4xx error
    assert!(response.status().is_client_error());
}

#[tokio::test]
async fn test_choose_endpoint_with_missing_content_type() {
    let app = test_app();

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                // No content-type header
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Missing content-type should return an error
    assert!(response.status().is_client_error());
}

// ============================================================================
// Custom state tests
// ============================================================================

#[tokio::test]
async fn test_choose_with_custom_bot_registry() {
    // Create a custom registry with only the random bot
    let bots = YBotRegistry::new().with_bot(Arc::new(RandomBot));
    let state = AppState::new(bots);
    let app = test_app_with_state(state);

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_choose_with_empty_bot_registry() {
    // Create an empty registry
    let bots = YBotRegistry::new();
    let state = AppState::new(bots);
    let app = test_app_with_state(state);

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body).unwrap();

    assert!(error_response.message.contains("Bot not found"));
}

#[tokio::test]
async fn test_choose_with_greedy_bots() {
    let app = test_app();

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let bot_ids = vec!["greedy_easy", "greedy_medium", "greedy_hard"];

    for bot_id in bot_ids {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/v1/ybot/choose/{}", bot_id))
                    .header("content-type", "application/json")
                    .body(Body::from(serde_json::to_string(&yen).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK, "Bot selection failed for {}", bot_id);
    }
}

// ============================================================================
// Route not found tests
// ============================================================================

#[tokio::test]
async fn test_unknown_route_returns_404() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/unknown/route")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_wrong_method_on_status_endpoint() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // POST to a GET-only endpoint should return 405 Method Not Allowed
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn test_get_on_choose_endpoint_returns_method_not_allowed() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/ybot/choose/random_bot")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}
