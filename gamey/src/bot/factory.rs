//! Factoría de bots para el juego Game of Y.
//!
//! Este módulo centraliza la creación y el registro de todas las estrategias
//! de bots disponibles en el sistema.

use std::sync::Arc;
use tracing::info;

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
    info!("Iniciando creación de registro de bots...");

    let mut registry = YBotRegistry::new();

    // 1. Registro de estrategias base
    let random_bot = Arc::new(RandomBot);
    info!("Registrando bot: {}", random_bot.name());
    registry = registry.with_bot(random_bot);

    let easy_greedy = Arc::new(GreedyBot::new("easy"));
    info!("Registrando bot: {}", easy_greedy.name());
    registry = registry.with_bot(easy_greedy);

    let medium_greedy = Arc::new(GreedyBot::new("medium"));
    info!("Registrando bot: {}", medium_greedy.name());
    registry = registry.with_bot(medium_greedy);

    let hard_greedy = Arc::new(GreedyBot::new("hard"));
    info!("Registrando bot: {}", hard_greedy.name());
    registry = registry.with_bot(hard_greedy);

    info!("Total de bots registrados en el registro base: {}", registry.count());

    // 2. Crear el bot selector aleatorio que conoce estas estrategias
    let registry_arc = Arc::new(registry);
    
    // 3. Crear el registro final que incluye al bot selector
    let mut final_registry = YBotRegistry::new();
    for bot in registry_arc.get_all_bots() {
        info!("Copiando bot al registro final: {}", bot.name());
        final_registry = final_registry.with_bot(bot);
    }
    
    let random_strategy = Arc::new(RandomStrategyBot::new(registry_arc.clone()));
    info!("Registrando bot selector: {}", random_strategy.name());
    final_registry = final_registry.with_bot(random_strategy);

    info!("Registro final completado con {} bots: {:?}",
          final_registry.count(),
          final_registry.names());

    final_registry
}