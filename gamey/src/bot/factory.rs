use std::sync::Arc;

use crate::bot::{
    ybot::YBot,
    ybot_registry::YBotRegistry,
    strategies::{
        random::RandomBot,
        minimax::MinimaxBot,
    },
};

pub fn create_all_bots() -> YBotRegistry {
    let mut registry = YBotRegistry::new();

    registry = registry
        .with_bot(Arc::new(RandomBot::new()))
        .with_bot(Arc::new(MinimaxBot::new(3))); // ejemplo con profundidad

    registry
}