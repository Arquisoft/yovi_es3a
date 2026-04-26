//! Core game types and logic for the Y game.
//!
//! This module contains the fundamental types for representing and playing Y:
//! - [`Coordinates`]: Barycentric coordinates on the triangular board
//! - [`GameY`]: The main game state and logic
//! - [`GameStatus`]: Whether the game is ongoing or finished
//! - [`Player`] and [`PlayerId`]: Player representation
//! - [`Movement`]: A move (placement or action) in the game
//! - [`GameAction`]: Special actions like swap or resign
//! - [`RenderOptions`]: Configuration for board rendering

pub mod action;
pub mod coord;
pub mod game;
pub mod movement;
pub mod player;
mod player_set;
pub mod render_options;
pub mod registry;

pub use action::*;
pub use coord::*;
pub use game::*;
pub use movement::*;
pub use player::*;
pub use render_options::*;
pub use registry::*;

/// Trait que define el comportamiento básico de cualquier juego en el sistema.
/// Implementa el patrón Prototype mediante el método `clone_box`.
pub trait Game: Send + Sync {
    /// Añade un movimiento al juego.
    fn add_move(&mut self, movement: Movement) -> crate::Result<()>;
    
    /// Comprueba si el juego ha terminado.
    fn check_game_over(&self) -> bool;
    
    /// Devuelve el estado actual del juego.
    fn status(&self) -> &GameStatus;
    
    /// Devuelve el nombre o tipo de juego.
    fn game_type(&self) -> &str;

    /// Método fundamental del patrón Prototype: permite clonar un objeto
    /// a través de un trait object.
    fn clone_box(&self) -> Box<dyn Game>;
}

pub(crate) type SetIdx = usize;
