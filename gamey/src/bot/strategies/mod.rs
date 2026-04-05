//! Strategy module for the Game of Y bots.
//!
//! This module contains different bot implementations (strategies) that
//! can be used to play the game.

pub mod random;
pub mod greedy;
pub mod random_strategy;

pub use random::*;
pub use greedy::*;
pub use random_strategy::*;
