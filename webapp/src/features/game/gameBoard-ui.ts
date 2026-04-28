
import type { GameMode, Player } from './gameBoard-logic';

export function getWinnerIcon(mode: GameMode, winner: Player | null)
{
    if (mode !== 'vs-bot') return '🎉';
    return winner === 1 ? '🏆' : '🤖';
}

export function getWinnerTitle(t: (key: string) => string, mode: GameMode, winner: Player | null)
{
    if (mode === 'vs-bot')
    {
        return winner === 1 ? t('gameboard.user_wins') : t('gameboard.bot_wins');
    }

    return `${t('gameboard.player')} ${winner} ${t('gameboard.wins')}!`;
}

export function getTurnLabel(t: (key: string) => string, mode: GameMode, currentPlayer: Player): string
{
    if (mode !== 'vs-bot')
    {
        return `${t('gameboard.player')} ${currentPlayer}`;
    }

    if (currentPlayer === 1)
    {
        return t('gameboard.you');
    }

    return t('gameboard.bot');
}
