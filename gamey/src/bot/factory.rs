//! Factoría de bots para el juego Game of Y.
//!
//! Este módulo centraliza la creación y el registro de todas las estrategias
//! de bots disponibles en el sistema.

use std::sync::Arc;

use crate::bot::{
    ybot_registry::YBotRegistry,
    strategies::random::RandomBot,
    strategies::greedy::GreedyBot,
    strategies::random_strategy::RandomStrategyBot,
};

/// Crea un registro con todas las implementaciones de bots disponibles.
///
/// Esta función es el punto central para añadir nuevos bots al sistema.
/// Al añadir un bot aquí, estará disponible tanto en la CLI como en el servidor API.
pub fn create_all_bots() -> YBotRegistry {
    let mut registry = YBotRegistry::new();

    // 1. Registro de estrategias base
    registry = registry
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(GreedyBot::new("easy")))
        .with_bot(Arc::new(GreedyBot::new("medium")))
        .with_bot(Arc::new(GreedyBot::new("hard")));

    // 2. Crear el bot selector aleatorio que conoce estas estrategias
    let registry_arc = Arc::new(registry);
    
    // 3. Crear el registro final que incluye al bot selector
    let mut final_registry = YBotRegistry::new();
    for bot in registry_arc.get_all_bots() {
        final_registry = final_registry.with_bot(bot);
    }
    
    final_registry.with_bot(Arc::new(RandomStrategyBot::new(registry_arc)))
}