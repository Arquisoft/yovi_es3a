//! Strategy module for the Game of Y bots.
//!
//! This module contains different bot implementations (strategies) that
//! can be used to play the game.

pub mod random;
pub mod greedy;

pub use random::*;
pub use greedy::*;
