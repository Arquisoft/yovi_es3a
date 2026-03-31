//! Factoría de bots para el juego Game of Y.
//!
//! Este módulo centraliza la creación y el registro de todas las estrategias
//! de bots disponibles en el sistema.

use std::sync::Arc;

use crate::bot::{
    ybot_registry::YBotRegistry,
    strategies::random::RandomBot,
    strategies::greedy::GreedyBot,
};

/// Crea un registro con todas las implementaciones de bots disponibles.
///
/// Esta función es el punto central para añadir nuevos bots al sistema.
/// Al añadir un bot aquí, estará disponible tanto en la CLI como en el servidor API.
pub fn create_all_bots() -> YBotRegistry {
    let mut registry = YBotRegistry::new();

    // Registro de bots disponibles
    registry = registry
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(GreedyBot::new("easy")))
        .with_bot(Arc::new(GreedyBot::new("medium")))
        .with_bot(Arc::new(GreedyBot::new("hard")));

    registry
}