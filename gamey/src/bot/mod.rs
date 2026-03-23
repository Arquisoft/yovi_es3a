//! Bot infrastructure for the Game of Y.
//!
//! This module provides the trait definitions and registries for AI bots.

pub mod ybot;
pub mod ybot_registry;
pub mod factory;
pub mod strategies;

pub use ybot::*;
pub use ybot_registry::*;
pub use factory::*;
pub use strategies::*;
