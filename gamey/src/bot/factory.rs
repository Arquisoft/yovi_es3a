use std::sync::Arc;

use crate::bot::{
    ybot_registry::YBotRegistry,
    strategies::random::RandomBot,
};

pub fn create_all_bots() -> YBotRegistry {
    let mut registry = YBotRegistry::new();

    registry = registry
        .with_bot(Arc::new(RandomBot));

    registry
}