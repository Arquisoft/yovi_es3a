//! GameY binary entry point.
//!
//! This is the main executable for the GameY application. It supports three modes:
//!
//! - **Human mode** (default): Two players take turns at the terminal
//! - **Computer mode**: Play against a bot
//! - **Server mode**: Run as an HTTP server exposing the bot API
//!
//! # Usage
//!
//! ```bash
//! # Play human vs human (default)
//! gamey
//!
//! # Play against the random bot
//! gamey --mode computer
//!
//! # Start the bot server on port 3000
//! gamey --mode server --port 3000
//! ```

use clap::Parser;
use gamey::{self, CliArgs, Mode, run_bot_server, run_cli_game};
use tracing_subscriber::prelude::*;

/// Main entry point for the GameY application.
///
/// Parses command-line arguments and runs either the CLI game or the HTTP server
/// depending on the selected mode.
#[tokio::main]
async fn main() {
    // Inicializar el subscriber de tracing con más detalle
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().with_target(true).with_thread_ids(true))
        .with(tracing_subscriber::EnvFilter::from_default_env()
            .add_directive(tracing_subscriber::filter::LevelFilter::INFO.into()))
        .init();

    eprintln!("🎮 GameY iniciándose...");
    let args = CliArgs::parse();
    eprintln!("📋 Argumentos parseados: mode={:?}, port={}", args.mode, args.port);

    if args.mode == Mode::Server {
        eprintln!("🚀 Iniciando servidor en puerto {}...", args.port);
        if let Err(e) = run_bot_server(args.port).await {
            eprintln!("❌ Error fatal del servidor: {}", e);
            std::process::exit(1);
        }
    } else {
        eprintln!("🎯 Iniciando juego CLI...");
        if let Err(e) = run_cli_game() {
            eprintln!("❌ Error fatal del juego: {}", e);
            std::process::exit(1);
        }
    }
}
