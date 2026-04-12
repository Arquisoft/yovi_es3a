use crate::{Coordinates, GameY, YBot, Movement, GameStatus, PlayerId};

pub struct GreedyBot {
    difficulty: String,
}

impl GreedyBot {
    pub fn new(difficulty: &str) -> Self {
        Self {
            difficulty: difficulty.to_string(),
        }
    }

    fn is_winning_move(&self, board: &GameY, coords: Coordinates) -> bool {
        let mut board_clone = board.clone();
        let player = match board.next_player() {
            Some(p) => p,
            None => return false,
        };

        let movement = Movement::Placement { player, coords };

        if board_clone.add_move(movement).is_ok() {
            if let GameStatus::Finished { winner } = board_clone.status() {
                return *winner == player;
            }
        }
        false
    }

    fn is_blocking_move(&self, board: &GameY, coords: Coordinates) -> bool {
        let mut board_clone = board.clone();

        let current_player = match board.next_player() {
            Some(p) => p,
            None => return false,
        };

        let opponent = if current_player.id() == 0 {
            PlayerId::new(1)
        } else {
            PlayerId::new(0)
        };

        let movement = Movement::Placement {
            player: opponent,
            coords,
        };

        // Simulamos jugada del oponente
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

        // 1. Intentar ganar
        if self.difficulty != "easy" {
            for &cell_idx in available_cells {
                let coords = Coordinates::from_index(cell_idx, board_size);
                if self.is_winning_move(board, coords) {
                    return Some(coords);
                }
            }
        }

        // 2. Bloquear
        if self.difficulty == "hard" {
            for &cell_idx in available_cells {
                let coords = Coordinates::from_index(cell_idx, board_size);
                if self.is_blocking_move(board, coords) {
                    return Some(coords);
                }
            }
        }

        // 3. Fallback
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
            "medium" => "Bot que intenta ganar si puede.",
            "hard" => "Bot que intenta ganar o bloquear.",
            _ => "Bot codicioso.",
        }
    }
}