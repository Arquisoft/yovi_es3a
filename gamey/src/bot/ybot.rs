use crate::{Coordinates, GameY};

/// Trait que representa un bot del juego Y (YBot).
/// Un YBot es una IA capaz de elegir movimientos en el juego.
/// Las implementaciones deben proporcionar un nombre y una forma
/// de elegir un movimiento dado el estado actual del juego.
pub trait YBot: Send + Sync {
    /// Devuelve el nombre del bot.
    fn name(&self) -> &str;

    /// Elige un movimiento en función del estado actual del tablero.
    ///
    /// Devuelve:
    /// - `Some(Coordinates)` si encuentra un movimiento válido
    /// - `None` si no puede realizar ningún movimiento
    fn choose_move(&self, board: &GameY) -> Option<Coordinates>;

    /// Devuelve el nivel de dificultad del bot (por ejemplo: "easy", "medium", "hard").
    fn difficulty(&self) -> &str;

    /// Devuelve una descripción de cómo funciona el bot.
    fn description(&self) -> &str;
}