//! Implementación de un bot que elige una estrategia al azar de las disponibles.
//!
//! Este bot actúa como un selector aleatorio entre todas las estrategias
//! registradas en el sistema.

use crate::{Coordinates, GameY, YBot, YBotRegistry};
use rand::prelude::IndexedRandom;
use std::sync::Arc;

/// Bot que selecciona aleatoriamente una estrategia para cada movimiento.
pub struct RandomStrategyBot {
    registry: Arc<YBotRegistry>,
}

impl RandomStrategyBot {
    /// Crea una nueva instancia de RandomStrategyBot con el registro de bots proporcionado.
    pub fn new(registry: Arc<YBotRegistry>) -> Self {
        Self { registry }
    }
}

impl YBot for RandomStrategyBot {
    fn name(&self) -> &str {
        "random_strategy_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        // Obtiene todos los bots del registro, excluyendo a sí mismo para evitar recursión infinita
        let all_bots = self.registry.get_all_bots();
        let available_strategies: Vec<_> = all_bots
            .iter()
            .filter(|b| b.name() != self.name())
            .collect();

        if available_strategies.is_empty() {
            return None;
        }

        // Selecciona una estrategia al azar
        let strategy = available_strategies.choose(&mut rand::rng())?;
        
        // Ejecuta la estrategia seleccionada
        strategy.choose_move(board)
    }

    fn difficulty(&self) -> &str {
        "Variable"
    }

    fn description(&self) -> &str {
        "Selecciona una estrategia diferente al azar para cada movimiento."
    }
}
