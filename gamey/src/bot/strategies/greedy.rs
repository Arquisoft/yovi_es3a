use crate::{Coordinates, GameY, YBot, Movement, GameStatus, PlayerId, YEN};
use rand::{Rng, thread_rng};

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

pub struct GreedyBot {
    difficulty: Difficulty,
}

struct BoardView {
    size: u32,
    owners: Vec<Option<PlayerId>>,
}

impl GreedyBot {
    pub fn new(difficulty: Difficulty) -> Self {
        Self { difficulty }
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

        if board_clone.add_move(movement).is_ok() {
            if let GameStatus::Finished { winner } = board_clone.status() {
                return *winner == opponent;
            }
        }
        false
    }


    fn build_view(&self, board: &GameY) -> BoardView {
        let yen: YEN = board.into();
        let size = yen.size();
        let layout = yen.layout();

        let mut owners = Vec::with_capacity((size * (size + 1) / 2) as usize);
        for ch in layout.chars().filter(|c| *c != '/') {
            match ch {
                'B' => owners.push(Some(PlayerId::new(0))),
                'R' => owners.push(Some(PlayerId::new(1))),
                '.' => owners.push(None),
                _ => owners.push(None),
            }
        }

        let expected = (size * (size + 1) / 2) as usize;
        owners.resize(expected, None);

        BoardView { size, owners }
    }

    fn owner_at(view: &BoardView, coords: Coordinates) -> Option<PlayerId> {
        let idx = coords.to_index(view.size);
        view.owners.get(idx as usize).cloned().unwrap_or(None)
    }

    fn neighbors(coords: Coordinates, size: u32) -> Vec<Coordinates> {
        let mut neighbors = Vec::with_capacity(6);
        let x = coords.x();
        let y = coords.y();
        let z = coords.z();

        if x > 0 {
            neighbors.push(Coordinates::new(x - 1, y + 1, z));
            neighbors.push(Coordinates::new(x - 1, y, z + 1));
        }
        if y > 0 {
            neighbors.push(Coordinates::new(x + 1, y - 1, z));
            neighbors.push(Coordinates::new(x, y - 1, z + 1));
        }
        if z > 0 {
            neighbors.push(Coordinates::new(x + 1, y, z - 1));
            neighbors.push(Coordinates::new(x, y + 1, z - 1));
        }

        neighbors
            .into_iter()
            .filter(|c| c.x() < size && c.y() < size && c.z() < size)
            .filter(|c| c.x() + c.y() + c.z() == size - 1)
            .collect()
    }



    fn component_touches_both_sides(view: &BoardView, player: PlayerId, start: Coordinates) -> bool {
        use std::collections::VecDeque;
        let n = view.owners.len();
        let mut visited = vec![false; n];
        let mut q = VecDeque::new();
        let start_idx = start.to_index(view.size) as usize;
        visited[start_idx] = true;
        q.push_back(start);

        let (side1, side2): (fn(&Coordinates) -> bool, fn(&Coordinates) -> bool) = match player.id() {
            0 => (Coordinates::touches_side_a, Coordinates::touches_side_b),
            1 => (Coordinates::touches_side_b, Coordinates::touches_side_c),
            _ => (Coordinates::touches_side_a, Coordinates::touches_side_b),
        };

        let mut s1 = false;
        let mut s2 = false;

        while let Some(c) = q.pop_front() {
            if side1(&c) { s1 = true; }
            if side2(&c) { s2 = true; }
            if s1 && s2 { return true; }

            for nb in GreedyBot::neighbors(c, view.size) {
                let idx = nb.to_index(view.size) as usize;
                if visited[idx] { continue; }
                match GreedyBot::owner_at(view, nb) {
                    Some(p) if p != player => continue,
                    _ => {}
                }
                visited[idx] = true;
                q.push_back(nb);
            }
        }
        
        false
    }

    fn component_touch_count(view: &BoardView, player: PlayerId, start: Coordinates) -> usize {
        use std::collections::VecDeque;
        let n = view.owners.len();
        let mut visited = vec![false; n];
        let mut q = VecDeque::new();
        let start_idx = start.to_index(view.size) as usize;
        visited[start_idx] = true;
        q.push_back(start);

        let (side1, side2): (fn(&Coordinates) -> bool, fn(&Coordinates) -> bool) = match player.id() {
            0 => (Coordinates::touches_side_a as fn(&Coordinates)->bool,
                Coordinates::touches_side_b as fn(&Coordinates)->bool),
            1 => (Coordinates::touches_side_b as fn(&Coordinates)->bool,
                Coordinates::touches_side_c as fn(&Coordinates)->bool),
            _ => (Coordinates::touches_side_a as fn(&Coordinates)->bool,
                Coordinates::touches_side_b as fn(&Coordinates)->bool),
        };

        let mut s1 = false;
        let mut s2 = false;

        while let Some(c) = q.pop_front() {
            if side1(&c) { s1 = true; }
            if side2(&c) { s2 = true; }
            if s1 && s2 { return 2; }

            for nb in GreedyBot::neighbors(c, view.size) {
                let idx = nb.to_index(view.size) as usize;
                if visited[idx] { continue; }
                match GreedyBot::owner_at(view, nb) {
                    Some(p) if p != player => continue,
                    _ => {}
                }
                visited[idx] = true;
                q.push_back(nb);
            }
        }
        (s1 as usize) + (s2 as usize)
    }



    fn score_connectivity(&self, view: &BoardView, player: PlayerId) -> i32 {
        use std::collections::VecDeque;

        let size = view.size;
        let mut total_score = 0;

        // BFS desde todas las celdas que tocan de un lado a otro lado deseado
        fn bfs(
            view: &BoardView,
            player: PlayerId,
            starts: Vec<Coordinates>,
            target_side: fn(&Coordinates) -> bool,
        ) -> i32 {
            let mut visited = vec![false; view.owners.len()];
            let mut queue = VecDeque::new();

            for s in starts {
                let idx = s.to_index(view.size) as usize;
                visited[idx] = true;
                queue.push_back((s, 0));
            }

            while let Some((c, dist)) = queue.pop_front() {
                if target_side(&c) {
                    return dist;
                }

                for n in GreedyBot::neighbors(c, view.size) {
                    let idx = n.to_index(view.size) as usize;
                    if visited[idx] {
                        continue;
                    }

                    // Transitables: propias o vacías
                    match GreedyBot::owner_at(view, n) {
                        Some(p) if p != player => continue,
                        _ => {}
                    }

                    visited[idx] = true;
                    queue.push_back((n, dist + 1));
                }
            }

            999 // No se encontró camino
        }

        // Lados
        let side_a = |c: &Coordinates| c.touches_side_a();
        let side_b = |c: &Coordinates| c.touches_side_b();
        let side_c = |c: &Coordinates| c.touches_side_c();

        // Celdas que tocan cada lado y que están vacías o pertenecen al jugador
        let mut a_cells = vec![];
        let mut b_cells = vec![];
        let mut c_cells = vec![];

        for idx in 0..view.owners.len() {
            let coords = Coordinates::from_index(idx as u32, size);
            let owner = Self::owner_at(view, coords);
            if owner.is_some() && owner != Some(player) {
                continue;
            }

            if side_a(&coords) { a_cells.push(coords); }
            if side_b(&coords) { b_cells.push(coords); }
            if side_c(&coords) { c_cells.push(coords); }
        }

        // Distancias entre lados
        let d_ab = bfs(view, player, a_cells.clone(), side_b);
        let d_bc = bfs(view, player, b_cells.clone(), side_c);
        let d_ca = bfs(view, player, c_cells.clone(), side_a);

        let conn_weight = match self.difficulty {
            Difficulty::Easy => 5,
            Difficulty::Medium => 10,
            Difficulty::Hard => 40,
        };

        total_score -= (d_ab + d_bc + d_ca) * conn_weight;
        total_score
    }

    fn score_bridges(&self, view: &BoardView, coords: Coordinates, player: PlayerId) -> i32 {
        let mut score = 0;

        fn in_bounds(c: Coordinates, size: u32) -> bool {
            c.x() < size && c.y() < size && c.z() < size
        }

        // Patrones de puente
        let patterns = [
            (Coordinates::new(1, 0, 0), Coordinates::new(0, 1, 0)),
            (Coordinates::new(0, 1, 0), Coordinates::new(0, 0, 1)),
            (Coordinates::new(1, 0, 0), Coordinates::new(0, 0, 1)),
        ];

        for (a_off, b_off) in patterns {
            let a = Coordinates::new(
                coords.x().saturating_sub(a_off.x()),
                coords.y().saturating_sub(a_off.y()),
                coords.z().saturating_sub(a_off.z()),
            );

            let b = Coordinates::new(
                coords.x().saturating_sub(b_off.x()),
                coords.y().saturating_sub(b_off.y()),
                coords.z().saturating_sub(b_off.z()),
            );

            if !in_bounds(a, view.size) || !in_bounds(b, view.size) {
                continue;
            }

            if a.x() < view.size && b.x() < view.size {
                let a_owner = Self::owner_at(view, a);
                let b_owner = Self::owner_at(view, b);

                if a_owner == Some(player) && b_owner == Some(player) {
                    score += 200; // Puente completado
                } else if a_owner == Some(player) || b_owner == Some(player) {
                    score += 120; // Amenaza de puente
                }
            }
        }

        score
    }

    fn branching_bonus(&self, view: &BoardView, coords: Coordinates, player: PlayerId) -> i32 {
        let mut empty_neighbors = 0;
        let mut friendly_neighbors = 0;

        for n in Self::neighbors(coords, view.size) {
            match Self::owner_at(view, n) {
                None => empty_neighbors += 1,
                Some(p) if p == player => friendly_neighbors += 1,
                _ => {}
            }
        }

        // Intentar conseguir muchas casillas temprano
        let total_cells = view.owners.len();
        let early_threshold = total_cells / 4;

        let stage: usize = view.owners.iter().filter(|o| o.is_some()).count();

        if stage < early_threshold {
            empty_neighbors * 20
        } else {
            friendly_neighbors * 20
        }
    }

    fn score_double_threat(&self, board: &GameY, coords: Coordinates, player: PlayerId) -> i32 {
        let mut clone = board.clone();

        // Jugar la jugada actual
        if clone.add_move(Movement::Placement { player, coords }).is_err() {
            return 0;
        }

        let mut winning_moves = 0;

        for &cell_idx in clone.available_cells() {
            let c = Coordinates::from_index(cell_idx, clone.board_size());
            let mut tmp = clone.clone();

            if tmp.add_move(Movement::Placement { player, coords: c }).is_ok() {
                if let GameStatus::Finished { winner } = tmp.status() {
                    if *winner == player {
                        winning_moves += 1;
                    }
                }
            }

            if winning_moves >= 2 {
                return 500; // Doble amenaza
            }
        }

        0
    }

    fn score_blocking_pressure(&self, board: &GameY, coords: Coordinates, me: PlayerId, opp: PlayerId) -> i32 {
        let view_before = self.build_view(board);
        let opp_before = self.score_connectivity(&view_before, opp);

        let mut clone = board.clone();
        if clone.add_move(Movement::Placement { player: me, coords }).is_err() {
            return 0;
        }

        let view_after = self.build_view(&clone);
        let opp_after = self.score_connectivity(&view_after, opp);

        let delta = opp_before - opp_after;
        if delta <= 0 {
            return 0;
        }

        let weight = match self.difficulty {
            Difficulty::Easy => 8,
            Difficulty::Medium => 18,
            Difficulty::Hard => 36,
        };

        delta * weight
    }

    fn quick_reply_penalty(&self, board: &GameY, coords: Coordinates) -> i32 {
        let mut clone = board.clone();
        let me = match board.next_player() { Some(p) => p, None => return 0 };
        if clone.add_move(Movement::Placement { player: me, coords }).is_err() {
            return 0;
        }
        let opp = match clone.next_player() { Some(p) => p, None => return 0 };
        let mut worst = 0;
        for &cell_idx in clone.available_cells() {
            let c = Coordinates::from_index(cell_idx, clone.board_size());
            
            let mut tmp = clone.clone();
            if tmp.add_move(Movement::Placement { player: opp, coords: c }).is_ok() {
                if let GameStatus::Finished { winner } = tmp.status() {
                    if *winner == opp {
                        return 30_000;
                    }
                }
            }
            
            let val = self.evaluate_static(&clone, c).clamp(-5000, 5000).abs();
            if val > worst { worst = val; }
            if worst > 2000 { break; }
        }
        worst / 4
    }

    #[doc(hidden)]
    pub fn test_component_touch_count(
        &self,
        board: &GameY,
        player: PlayerId,
        start: Coordinates,
    ) -> usize {
        let view = self.build_view(board);
        Self::component_touch_count(&view, player, start)
    }

    #[doc(hidden)]
    pub fn test_score_connectivity(&self, board: &GameY, player: PlayerId) -> i32 {
        let view = self.build_view(board);
        Self::score_connectivity(self, &view, player)
    }

    #[doc(hidden)]
    pub fn test_quick_reply_penalty(&self, board: &GameY, coords: Coordinates) -> i32 {
        Self::quick_reply_penalty(self, board, coords)
    }

    fn jitter(&self, score: i32) -> i32 {
        let mut rng = rand::thread_rng();

        let noise = match self.difficulty {
            Difficulty::Easy => rng.gen_range(-200..200),
            Difficulty::Medium => rng.gen_range(-120..120),
            Difficulty::Hard => rng.gen_range(-5..5),
        };

        score + noise
    }

    fn evaluate_static(&self, board: &GameY, coords: Coordinates) -> i32 {
        let mut clone = board.clone();
        let player = match board.next_player() {
            Some(p) => p,
            None => return -9999,
        };

        // Aplicar movimiento.
        let movement = Movement::Placement { player, coords };
        if clone.add_move(movement).is_err() {
            return -9999;
        }

        // Movimiento ganador inmediato.
        if let GameStatus::Finished { winner } = clone.status() {
            if *winner == player {
                return 50_000;
            }
        }

        let view = self.build_view(&clone);
        let mut score = 0;

        if !Self::component_touches_both_sides(&view , player, coords) {
            let dead_penalty = match self.difficulty {
                Difficulty::Easy => 200,
                Difficulty::Medium => 1200,
                Difficulty::Hard => 3000,
            };
            score -= dead_penalty;
        }

        // 1. Centro geométrico.
        let size_i = view .size as i32;
        let cx = coords.x() as i32 - size_i / 2;
        let cy = coords.y() as i32 - size_i / 2;
        let cz = coords.z() as i32 - size_i / 2;
        score -= cx.abs() + cy.abs() + cz.abs();

        let opp = if player.id() == 0 { PlayerId::new(1) } else { PlayerId::new(0) };

        let mut friendly_adj = 0;
        let mut enemy_adj = 0;

        for n in Self::neighbors(coords, view.size) {
            match Self::owner_at(&view, n) {
                Some(p) if p == player => friendly_adj += 1,
                Some(p) if p == opp => enemy_adj += 1,
                _ => {}
            }
        }

        // 2. Conexión a lados ganadores.
        let (side1, side2): (
            fn(&Coordinates) -> bool,
            fn(&Coordinates) -> bool
        ) = match player.id() {
            0 => (
                Coordinates::touches_side_a as fn(&Coordinates) -> bool,
                Coordinates::touches_side_b as fn(&Coordinates) -> bool,
            ),
            1 => (
                Coordinates::touches_side_b as fn(&Coordinates) -> bool,
                Coordinates::touches_side_c as fn(&Coordinates) -> bool,
            ),
            _ => unreachable!(),
        };

        // Reward only the player's winning sides
        let side_bonus = match self.difficulty {
            Difficulty::Easy => 8,
            Difficulty::Medium => 20,
            Difficulty::Hard => 80,
        };

        if side1(&coords) { score += side_bonus; }
        if side2(&coords) { score += side_bonus; }

        // 3. Adyacencias reales, cadenas y contacto con el rival.
        score += friendly_adj * 15;
        score -= enemy_adj * 5;

        if enemy_adj >= 2 {
            score -= 60;
        }

        // 4. Potencial de extensión.
        let mut extension_potential = 0;
        for n in Self::neighbors(coords, view.size) {
            if Self::owner_at(&view, n).is_none() {
                extension_potential += 1;
            }
        }
        score += extension_potential * 15;

        // 5. Profundidad geométrica (ligero sesgo hacia el interior).
        score += (coords.x() + coords.y() + coords.z()) as i32;

        score += self.score_connectivity(&view, player);
        score += self.score_bridges(&view, coords, player);
        score += self.branching_bonus(&view, coords, player);
        score += self.score_double_threat(board, coords, player);

        let me = player;
        let opp = if me.id() == 0 { PlayerId::new(1) } else { PlayerId::new(0) };
        score += self.score_blocking_pressure(board, coords, me, opp);

        score
    }

    fn evaluate_with_reply(&self, board: &GameY, coords: Coordinates) -> i32 {
        let mut clone = board.clone();
        let me = match board.next_player() {
            Some(p) => p,
            None => return -9999,
        };

        // Juega el bot.
        let my_move = Movement::Placement { player: me, coords };
        if clone.add_move(my_move).is_err() {
            return -9999;
        }

        // Si gana, no hace falta mirar más.
        if let GameStatus::Finished { winner } = clone.status() {
            if *winner == me {
                return 50_000;
            }
        }

        // Turno del jugador.
        let opp = match clone.next_player() {
            Some(p) => p,
            None => return self.evaluate_static(board, coords),
        };
        let opp_cells = clone.available_cells();

        if opp_cells.is_empty() {
            return self.evaluate_static(board, coords);
        }

        // Penalización fuerte si el rival tiene victoria inmediata tras nuestra jugada.
        for &cell_idx in opp_cells {
            let c = Coordinates::from_index(cell_idx, clone.board_size());
            let mut tmp = clone.clone();
            let mv = Movement::Placement { player: opp, coords: c };
            if tmp.add_move(mv).is_ok() {
                if let GameStatus::Finished { winner } = tmp.status() {
                    if *winner == opp {
                        return -30_000;
                    }
                }
            }
        }

        // Estimar la mejor respuesta del rival con la misma heurística estática.
        let mut best_reply = i32::MIN;
        for &cell_idx in opp_cells {
            let c = Coordinates::from_index(cell_idx, clone.board_size());
            let reply_score = self.evaluate_static(&clone, c);
            if reply_score > best_reply {
                best_reply = reply_score;
            }
        }

        let my_base = self.evaluate_static(board, coords);
        my_base - best_reply / 2
    }
}

impl YBot for GreedyBot {
    fn name(&self) -> &str {
        match self.difficulty {
            Difficulty::Easy => "greedy_easy",
            Difficulty::Medium => "greedy_medium",
            Difficulty::Hard => "greedy_hard",
        }
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        if available_cells.is_empty() {
            return None;
        }

        let board_size = board.board_size();
        let me = board.next_player()?;
        let opp = if me.id() == 0 { PlayerId::new(1) } else { PlayerId::new(0) };
        
        // 1. Intentar ganar.
        if !matches!(self.difficulty, Difficulty::Easy) {
            for &cell_idx in available_cells {
                let coords = Coordinates::from_index(cell_idx, board_size);
                if self.is_winning_move(board, coords) {
                    return Some(coords);
                }
            }
        }

        // 2. Intentar bloquear al oponente.
        if matches!(self.difficulty, Difficulty::Hard) {
            for &cell_idx in available_cells {
                let coords = Coordinates::from_index(cell_idx, board_size);
                if self.is_blocking_move(board, coords) {
                    return Some(coords);
                }
            }
        }

        // 3. Selección codiciosa según dificultad.
        let view_before = self.build_view(board);
        let opp_conn_before = self.score_connectivity(&view_before, opp);


        let mut scored: Vec<(i32, Coordinates)> = Vec::with_capacity(available_cells.len());

        for &idx in available_cells {
            let c = Coordinates::from_index(idx, board_size);

            let mut clone = board.clone();
            if clone.add_move(Movement::Placement { player: me, coords: c }).is_err() {
                continue;
            }

            let view_after = self.build_view(&clone);

            let base = self.evaluate_static(board, c);
            let my_conn = self.score_connectivity(&view_after, me);
            let opp_conn_after = self.score_connectivity(&view_after, opp);

            let block_value = opp_conn_before - opp_conn_after;

            let combined = match self.difficulty {
                Difficulty::Hard => base + my_conn * 40 + block_value * 30,
                Difficulty::Medium => base + my_conn * 20 + block_value * 10,
                Difficulty::Easy => base,
            };

            scored.push((self.jitter(combined), c));
        }

        scored.sort_by(|a, b| b.0.cmp(&a.0));

        if matches!(self.difficulty, Difficulty::Hard) {
            let mut best = i32::MIN;
            let mut best_move = None;

            for &(_, c) in scored.iter().take(3) {
                let deep = self.evaluate_with_reply(board, c);
                if deep > best {
                    best = deep;
                    best_move = Some(c);
                }
            }

            if best_move.is_some() {
                return best_move;
            }
        }

        scored.first().map(|(_, c)| *c)
    }

    fn difficulty(&self) -> &str {
        match self.difficulty {
            Difficulty::Easy => "Fácil",
            Difficulty::Medium => "Media",
            Difficulty::Hard => "Difícil",
        }
    }

    fn description(&self) -> &str {
        match self.difficulty {
            Difficulty::Easy => "Bot codicioso básico que elige la primera opción disponible.",
            Difficulty::Medium => "Bot que intenta ganar si puede.",
            Difficulty::Hard => "Bot que intenta ganar o bloquear.",
        }
    }
}

