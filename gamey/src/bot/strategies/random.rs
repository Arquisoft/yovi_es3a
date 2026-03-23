//! Implementación simple de un bot aleatorio.
//!
//! Este módulo proporciona [`RandomBot`], un bot que realiza movimientos válidos al azar.
//! Es útil para pruebas y como oponente base.

use crate::{Coordinates, GameY, YBot};
use rand::prelude::IndexedRandom;

/// Bot que elige movimientos aleatorios entre las casillas disponibles.
///
/// Es la implementación más simple posible: selecciona una casilla vacía al azar.
/// No tiene estrategia, pero sirve como referencia base y para testing.
pub struct RandomBot;

impl YBot for RandomBot {

    /// Devuelve el nombre del bot.
    fn name(&self) -> &str {
        "random_bot"
    }

    /// Elige un movimiento aleatorio entre las casillas disponibles.
    ///
    /// Pasos:
    /// 1. Obtiene las casillas libres del tablero
    /// 2. Selecciona una al azar
    /// 3. Convierte el índice en coordenadas
    /// 4. Devuelve el resultado
    ///
    /// Devuelve `None` si no hay movimientos posibles (tablero lleno).
    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {

        // Obtiene las casillas disponibles (índices)
        let available_cells = board.available_cells();

        // Selecciona una casilla aleatoria (puede fallar si está vacío)
        let cell = available_cells.choose(&mut rand::rng())?;

        // Convierte el índice a coordenadas del tablero
        let coordinates = Coordinates::from_index(*cell, board.board_size());

        Some(coordinates)
    }

    /// Devuelve el nivel de dificultad del bot.
    fn difficulty(&self) -> &str {
        "Fácil"
    }

    /// Describe el comportamiento del bot.
    fn description(&self) -> &str {
        "Elige una casilla libre al azar en el tablero."
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Movement, PlayerId};

    /// Comprueba que el nombre del bot es correcto.
    #[test]
    fn test_random_bot_name() {
        let bot = RandomBot;
        assert_eq!(bot.name(), "random_bot");
    }

    /// Comprueba que el bot devuelve un movimiento en un tablero vacío.
    #[test]
    fn test_random_bot_returns_move_on_empty_board() {
        let bot = RandomBot;
        let game = GameY::new(5);

        let chosen_move = bot.choose_move(&game);
        assert!(chosen_move.is_some());
    }

    /// Comprueba que las coordenadas devueltas son válidas.
    #[test]
    fn test_random_bot_returns_valid_coordinates() {
        let bot = RandomBot;
        let game = GameY::new(5);

        let coords = bot.choose_move(&game).unwrap();
        let index = coords.to_index(game.board_size());

        // Para tamaño 5: (5 * 6) / 2 = 15 celdas
        assert!(index < 15);
    }

    /// Comprueba que devuelve None si el tablero está lleno.
    #[test]
    fn test_random_bot_returns_none_on_full_board() {
        let bot = RandomBot;
        let mut game = GameY::new(2);

        // Rellena completamente el tablero
        let moves = vec![
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(1, 0, 0),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(0, 1, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 0, 1),
            },
        ];

        for mv in moves {
            game.add_move(mv).unwrap();
        }

        // El tablero está lleno → no hay movimientos posibles
        assert!(game.available_cells().is_empty());

        let chosen_move = bot.choose_move(&game);
        assert!(chosen_move.is_none());
    }

    /// Comprueba que el bot solo elige entre casillas disponibles.
    #[test]
    fn test_random_bot_chooses_from_available_cells() {
        let bot = RandomBot;
        let mut game = GameY::new(3);

        // Ocupa una casilla
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 0, 0),
        })
        .unwrap();

        let coords = bot.choose_move(&game).unwrap();
        let index = coords.to_index(game.board_size());

        // Debe estar entre las casillas libres
        assert!(game.available_cells().contains(&index));
    }

    /// Comprueba múltiples ejecuciones (aleatoriedad consistente).
    #[test]
    fn test_random_bot_multiple_calls_return_valid_moves() {
        let bot = RandomBot;
        let game = GameY::new(7);

        // Ejecuta varias veces para comprobar consistencia
        for _ in 0..10 {
            let coords = bot.choose_move(&game).unwrap();
            let index = coords.to_index(game.board_size());

            // Para tamaño 7: (7 * 8) / 2 = 28 celdas
            assert!(index < 28);
            assert!(game.available_cells().contains(&index));
        }
    }
}