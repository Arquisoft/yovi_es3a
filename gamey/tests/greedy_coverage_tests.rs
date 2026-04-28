use gamey::{Coordinates, Difficulty, GameY, GreedyBot, Movement, PlayerId};

fn board_with_moves(size: u32, moves: &[(PlayerId, Coordinates)]) -> GameY {
    let mut board = GameY::new(size);

    for &(player, coords) in moves {
        board
            .add_move(Movement::Placement { player, coords })
            .unwrap();
    }

    board
}

#[test]
fn test_component_touch_count_counts_one_and_two_sides() {
    let bot = GreedyBot::new(Difficulty::Easy);

    let single_side_board = board_with_moves(
        3,
        &[
            (PlayerId::new(0), Coordinates::new(2, 0, 0)),
            (PlayerId::new(1), Coordinates::new(1, 0, 1)),
            (PlayerId::new(1), Coordinates::new(1, 1, 0)),
            (PlayerId::new(1), Coordinates::new(0, 0, 2)),
            (PlayerId::new(1), Coordinates::new(0, 1, 1)),
            (PlayerId::new(1), Coordinates::new(0, 2, 0)),
        ],
    );
    assert_eq!(
        bot.test_component_touch_count(
            &single_side_board,
            PlayerId::new(0),
            Coordinates::new(2, 0, 0)
        ),
        1
    );

    let connected_board = board_with_moves(
        3,
        &[
            (PlayerId::new(0), Coordinates::new(0, 1, 1)),
            (PlayerId::new(0), Coordinates::new(1, 0, 1)),
        ],
    );
    assert_eq!(
        bot.test_component_touch_count(
            &connected_board,
            PlayerId::new(0),
            Coordinates::new(0, 1, 1)
        ),
        2
    );
}

#[test]
fn test_score_connectivity_scales_with_difficulty() {
    let board = board_with_moves(3, &[(PlayerId::new(1), Coordinates::new(0, 0, 2))]);

    let easy = GreedyBot::new(Difficulty::Easy);
    let medium = GreedyBot::new(Difficulty::Medium);
    let hard = GreedyBot::new(Difficulty::Hard);

    assert_eq!(easy.test_score_connectivity(&board, PlayerId::new(0)), -5);
    assert_eq!(medium.test_score_connectivity(&board, PlayerId::new(0)), -10);
    assert_eq!(hard.test_score_connectivity(&board, PlayerId::new(0)), -40);
}

#[test]
fn test_quick_reply_penalty_detects_immediate_reply_win() {
    let bot = GreedyBot::new(Difficulty::Hard);
    let board = board_with_moves(
        3,
        &[
            (PlayerId::new(1), Coordinates::new(2, 0, 0)),
            (PlayerId::new(1), Coordinates::new(0, 0, 2)),
        ],
    );

    let penalty = bot.test_quick_reply_penalty(&board, Coordinates::new(0, 1, 1));

    assert_eq!(penalty, 30_000);
}

#[test]
fn test_quick_reply_penalty_falls_back_when_no_forced_reply_exists() {
    let bot = GreedyBot::new(Difficulty::Medium);
    let board = GameY::new(3);

    let penalty = bot.test_quick_reply_penalty(&board, Coordinates::new(0, 1, 1));

    assert!(penalty > 0);
    assert!(penalty < 30_000);
}

#[test]
fn test_quick_reply_penalty_returns_zero_for_occupied_cell() {
    let bot = GreedyBot::new(Difficulty::Easy);
    let board = board_with_moves(3, &[(PlayerId::new(0), Coordinates::new(0, 1, 1))]);

    assert_eq!(bot.test_quick_reply_penalty(&board, Coordinates::new(0, 1, 1)), 0);
}

