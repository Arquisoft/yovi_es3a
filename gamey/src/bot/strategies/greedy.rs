//! Implementación de un bot con estrategia codiciosa (greedy).
//!
//! Este bot intenta ganar inmediatamente si es posible, o bloquear al oponente.

use crate::{Coordinates, GameY, YBot, Movement, GameStatus};

/// Bot que elige movimientos basados en una estrategia codiciosa simple.
pub struct GreedyBot {
    difficulty: String,
}

impl GreedyBot {
    /// Crea una nueva instancia de GreedyBot con la dificultad especificada.
    pub fn new(difficulty: &str) -> Self {
        Self {
            difficulty: difficulty.to_string(),
        }
    }

    /// Comprueba si un movimiento resulta en una victoria para el jugador actual.
    fn is_winning_move(&self, board: &GameY, coords: Coordinates) -> bool {
        let mut board_clone = board.clone();
        let player = board.next_player().unwrap_or_default();
        
        let movement = Movement::Placement {
            player,
            coords,
        };
        
        if board_clone.add_move(movement).is_ok() {
            if let GameStatus::Finished { winner } = board_clone.status() {
                return *winner == player;
            }
        }
        false
    }

    /// Comprueba si un movimiento bloquea una victoria inmediata del oponente.
    fn is_blocking_move(&self, board: &GameY, coords: Coordinates) -> bool {
        let mut board_clone = board.clone();
        let current_player = board.next_player().unwrap_or_default();
        let opponent = if current_player.as_u32() == 0 {
            crate::PlayerId::new(1)
        } else {
            crate::PlayerId::new(0)
        };
        
        let movement = Movement::Placement {
            player: opponent,
            coords,
        };
        
        // Simulamos que el oponente mueve aquí
        if board_clone.add_move(movement).is_ok() {
            if let GameStatus::Finished { winner } = board_clone.status() {
                return *winner == opponent;
            }
        }
        false
    }
}

impl YBot for GreedyBot {
    fn name(&self) -> &str {
        match self.difficulty.as_str() {
            "easy" => "greedy_easy",
            "medium" => "greedy_medium",
            "hard" => "greedy_hard",
            _ => "greedy_bot",
        }
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        if available_cells.is_empty() {
            return None;
        }

        let board_size = board.board_size();

        // 1. Intentar ganar inmediatamente (disponible en medium y hard)
        if self.difficulty != "easy" {
            for &cell_idx in available_cells {
                let coords = Coordinates::from_index(cell_idx, board_size);
                if self.is_winning_move(board, coords) {
                    return Some(coords);
                }
            }
        }

        // 2. Intentar bloquear al oponente (disponible en hard)
        if self.difficulty == "hard" {
            for &cell_idx in available_cells {
                let coords = Coordinates::from_index(cell_idx, board_size);
                if self.is_blocking_move(board, coords) {
                    return Some(coords);
                }
            }
        }

        // 3. Si no hay jugada crítica, elegir una aleatoria (o la primera disponible por simplicidad)
        // En una implementación real, aquí se podría buscar la jugada que más conecte
        let cell_idx = available_cells[0];
        Some(Coordinates::from_index(cell_idx, board_size))
    }

    fn difficulty(&self) -> &str {
        match self.difficulty.as_str() {
            "easy" => "Fácil",
            "medium" => "Media",
            "hard" => "Difícil",
            _ => &self.difficulty,
        }
    }

    fn description(&self) -> &str {
        match self.difficulty.as_str() {
            "easy" => "Bot codicioso básico que elige la primera opción disponible.",
            "medium" => "Bot codicioso que intenta ganar si tiene una oportunidad inmediata.",
            "hard" => "Bot codicioso que intenta ganar o bloquear al oponente si es necesario.",
            _ => "Bot con estrategia codiciosa.",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{GameY, PlayerId};

    #[test]
    fn test_greedy_bot_names() {
        let bot_easy = GreedyBot::new("easy");
        let bot_medium = GreedyBot::new("medium");
        let bot_hard = GreedyBot::new("hard");

        assert_eq!(bot_easy.name(), "greedy_easy");
        assert_eq!(bot_medium.name(), "greedy_medium");
        assert_eq!(bot_hard.name(), "greedy_hard");
    }

    #[test]
    fn test_greedy_bot_difficulties() {
        let bot_easy = GreedyBot::new("easy");
        let bot_medium = GreedyBot::new("medium");
        let bot_hard = GreedyBot::new("hard");

        assert_eq!(bot_easy.difficulty(), "Fácil");
        assert_eq!(bot_medium.difficulty(), "Media");
        assert_eq!(bot_hard.difficulty(), "Difícil");
    }

    #[test]
    fn test_greedy_bot_chooses_move() {
        let bot = GreedyBot::new("easy");
        let game = GameY::new(3);
        let move_opt = bot.choose_move(&game);
        assert!(move_opt.is_some());
    }
}
