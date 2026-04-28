
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getWinnerIcon, getWinnerTitle, getTurnLabel } from './gameBoard-ui'
import { buildCells, hexPoints, getSide, sideClassFor, HEX_SIZE,DIST_X, DIST_Y, PADDING, parseBoardFromYEN, getWinnerFromYEN, getCurrentPlayerFromYEN,  type GameMode, type Player, type CellState } from './gameBoard-logic'

import './GameBoard.css';


function getWebSocketURL(): string 
{
    const protocol = globalThis.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${globalThis.location.hostname}:4000/ws`;
}

const WS_URL = getWebSocketURL();   // Inicialización de la WebSocket para conectar con GameY.


// Props separadas para evitar error de SonarQube
interface GameBoardProps
{
  readonly username: string;
}

function GameBoard({ username }: GameBoardProps) {
    const { t } = useTranslation();
    
    const [gameMode, setGameMode] = useState<GameMode>('pvp');
    const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
    const [connected, setConnected] = useState<boolean>(false); 

    const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
    const [winner, setWinner] = useState<Player | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    
    const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
    const [botID, setBotID] = useState<string>("greedy_easy");
    const [sideLen, setSideLen] = useState<number>(7);

    const wsRef = useRef<WebSocket | null>(null);
    const awaitingBotRef = useRef<boolean>(false);

    const SVG_WIDTH = useMemo(
        () => 2 * HEX_SIZE + (sideLen - 1) * DIST_X + 2 * PADDING, [sideLen]);

    const SVG_HEIGHT = useMemo(
        () => 2 * HEX_SIZE + (sideLen - 1) * DIST_Y + 2 * PADDING, [sideLen]);

    const CELLS = useMemo(() => buildCells(sideLen), [sideLen]);
    const [board, setBoard] = useState<CellState[]>(() => new Array(CELLS.length).fill(0));

    const BOTS = [
        {
            name: "random_bot",
            difficulty: t('gameboard.bot.easy'),
            description: t('gameboard.bot.random_bot.description')
        },
        {
            name: "greedy_easy",
            difficulty: t('gameboard.bot.easy'),
            description: t('gameboard.bot.greedy_easy.description')
        },
        {
            name: "greedy_medium",
            difficulty: t('gameboard.bot.medium'),
            description: t('gameboard.bot.greedy_medium.description')
        },
        {
            name: "greedy_hard",
            difficulty: t('gameboard.bot.hard'),
            description: t('gameboard.bot.greedy_hard.description')
        },
        {
            name: "random_strategy_bot",
            difficulty: t('gameboard.bot.variable'),
            description: t('gameboard.bot.random_strategy_bot.description')
        }];

    
    // ----- Websocket -----
    function connectWS(mode: GameMode) 
    {
        if (wsRef.current)
        {
            wsRef.current.close();
            wsRef.current = null;
        }

        const ws = new WebSocket(WS_URL);

        ws.onopen = () =>
        {
            setConnected(true);

            const msg: Record<string, unknown> =
            {
                type: 'start',
                size: sideLen
            };
            
            if (mode === 'vs-bot')
            {
                msg.bot_id = botID;
            }

            ws.send(JSON.stringify(msg));
        };

        ws.onmessage = async (ev) =>
        {
            const parsed = JSON.parse(ev.data);

            if (parsed.type === 'state')
            {
                const newBoard = parseBoardFromYEN(parsed.yen, sideLen);
                const newWinner = await getWinnerFromYEN(parsed, username, gameMode);
                const newPlayer = getCurrentPlayerFromYEN(parsed);

                setBoard(newBoard);
                setWinner(newWinner);
                setCurrentPlayer(newPlayer);

                if (awaitingBotRef.current)
                {
                    awaitingBotRef.current = false;
                    setIsBotThinking(false);
                }
            }

            if (parsed.type === 'error')
            {
                console.warn('Server error:', parsed.message);
                setIsBotThinking(false);
                awaitingBotRef.current = false;
            }
        };

        ws.onclose = () =>
        {
            setConnected(false);
            setIsBotThinking(false);
            wsRef.current = null;
        };

        ws.onerror = () =>
        {
            console.warn('WS error');
            setIsBotThinking(false);
        };

        wsRef.current = ws;
    }

    // Cleanup on unmount
    useEffect(() =>
    {
        return () =>
        {
            wsRef.current?.close();
        };
    }, []);


    // ----- Acciones del juego -----
    function sendCommand(line: string)
    {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({type: 'command', line}));
    }

    function handleClick(index: number)
    {
        if (!connected) return;
        if (board[index] !== 0 || winner || isBotThinking) return;
        if (gameMode === 'vs-bot' && currentPlayer === 2) return;

        // In vs-bot mode, flag that we're waiting for bot reply
        if (gameMode === 'vs-bot')
        {
            awaitingBotRef.current = true;
            setIsBotThinking(true);
        }

        sendCommand(String(index));
    }

    function handleReset()
    {
        setBoard(new Array(CELLS.length).fill(0));
        setCurrentPlayer(1);
        setWinner(null);
        setHovered(null);
        setIsBotThinking(false);
        awaitingBotRef.current = false;

        if (wsRef.current?.readyState === WebSocket.OPEN)
        {
            const msg: Record<string, unknown> = {type: 'start', size: sideLen};
            if (gameMode === 'vs-bot') msg.bot_id = botID;
            wsRef.current.send(JSON.stringify(msg));
        } else
        {
            connectWS(gameMode);
        }
    }

    function handleBackToMenu()
    {
        wsRef.current?.close();
        wsRef.current = null;
        setIsGameStarted(false);
        setConnected(false);
        setBoard(new Array(CELLS.length).fill(0));
        setCurrentPlayer(1);
        setWinner(null);
        setHovered(null);
        setIsBotThinking(false);
    }

    function handleStartGame(mode: GameMode)
    {
        setGameMode(mode);
        setIsGameStarted(true);
        setBoard(new Array(CELLS.length).fill(0));
        setCurrentPlayer(1);
        setWinner(null);
        connectWS(mode);
    }


    // ----- Renderizar el juego -----
    const winnerIcon = getWinnerIcon(gameMode, winner);
    const winnerTitle = getWinnerTitle(t, gameMode, winner);

    const winnerSubtitle =
        winner === 2
            ? t('gameboard.blue_connect')
            : t('gameboard.red_connect');

    const turnLabel = getTurnLabel(t, gameMode, currentPlayer);

    const onlineStatusClass = connected ? 'online' : 'offline';
    const onlineStatusText = connected ? '🟢 Online' : '🔴 Offline';

    if (!isGameStarted)
    {
        return (
            <div className="gb-wrapper">
                <div className="gb-mode-select">
                    <h2 className="gb-mode-title"> {t('gameboard.header')} </h2>
                    <p className="gb-mode-subtitle"> {t('gameboard.select')} </p>
                    
                    <div className="gb-mode-cards">
                        <button  className="gb-card" onClick={() => handleStartGame('pvp')}>
                            <div className="gb-card-icon">👥</div>
                            <div className="gb-card-title"> {t('gameboard.pvp.header')} </div>
                            <div className="gb-card-desc"> {t('gameboard.pvp.description')} </div>
                        </button >
                        <button  className="gb-card" onClick={() => handleStartGame('vs-bot')}>
                            <div className="gb-card-icon">🤖</div>
                            <div className="gb-card-title"> {t('gameboard.pve.header')} </div>
                            <div className="gb-card-desc"> {t('gameboard.pve.description')} </div>
                        </button >
                    </div>

                    <div className="gb-options-panel">
                        <h2> {t('gameboard.options')} </h2>

                        <div className="gb-option-row">
                            <div className="gb-select-block">
                                <label htmlFor="bot-select"> {t('gameboard.difficulty')} </label>
                                <select id="bot-select" value={botID} onChange={(e) => setBotID(e.target.value)}>
                                    {BOTS.map(bot => (
                                    <option key={bot.name} value={bot.name}>
                                        {bot.difficulty.toUpperCase()} — {bot.description}
                                    </option>
                                    ))}
                                </select>
                            </div>

                            <div className="gb-select-block">
                                <label htmlFor="size-select">{t('gameboard.size')}:</label>
                                <select id="size-select" value={sideLen} onChange={(e) => setSideLen(Number(e.target.value))}>
                                    <option value={7}>7 (28 {t('gameboard.tiles')})</option>
                                    <option value={9}>9 (45 {t('gameboard.tiles')})</option>
                                    <option value={11}>11 (66 {t('gameboard.tiles')})</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="gb-wrapper">
                <div className="gb-loading">
                    <div className="gb-spinner"></div>
                    <p className="gb-loading-text">{t('gameboard.connecting')}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="gb-wrapper">
            {winner && (
                <div className="gb-winner-overlay">
                    <div className={`gb-winner-modal player${winner}`}>
                        <div className="gb-winner-icon"> {winnerIcon}</div>
                        <h2 className="gb-winner-title"> {winnerTitle}</h2>
                        <p className="gb-winner-subtitle"> {winnerSubtitle}</p>
                        <div className="gb-winner-actions">
                            <button className="gb-winner-btn" onClick={handleReset}>
                                {t('gameboard.play_again')}
                            </button>
                            <button className="gb-winner-btn secondary" onClick={handleBackToMenu}>
                                {t('gameboard.change_mode')}
                            </button>
                        </div>
                    </div>
                </div>
                )}

            <div className="gb-header">
                <button className="gb-back" onClick={handleBackToMenu}>← {t('gameboard.menu')} </button>
                <div className={`gb-turn player${currentPlayer} ${isBotThinking ? 'thinking' : ''}`}>
                    <span className="gb-dot" />
                    {isBotThinking ? (
                        <span>{t('gameboard.thinking')}<span className="gb-thinking-dots"></span></span>
                    ) : (
                        <span>{t('gameboard.turn')}: {turnLabel}</span>
                    )}
                </div>

                <span className={`gb-status ${onlineStatusClass}`}>
          {onlineStatusText}
        </span>
                <button className="gb-reset" onClick={handleReset}> {t('gameboard.reset')} </button>
            </div>

            <svg
                className={`gb-svg ${isBotThinking ? 'gb-disabled' : ''}`}
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            >
                <defs>
                    <filter id="glow1">
                        <feGaussianBlur stdDeviation="3.5" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="glow2">
                        <feGaussianBlur stdDeviation="3.5" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {CELLS.map(cell => {
                    const state = board[cell.index];
                    const side = getSide(cell);
                    const isHovered = hovered === cell.index && state === 0 && !winner && !isBotThinking;

                    const cellClass = [
                        'gb-hex', sideClassFor(side, state), isHovered ? 'gb-hover' : '',
                    ].filter(Boolean).join(' ');

                    let filterAttr: string | undefined;
                    if (state === 1) filterAttr = 'url(#glow1)';
                    else if (state === 2) filterAttr = 'url(#glow2)';
                    else filterAttr = undefined;

                    return (
                        <g key={cell.index}>
                        <polygon
                            className={cellClass}
                            points={hexPoints(cell.cx, cell.cy, HEX_SIZE - 2)}
                            onClick={() => handleClick(cell.index)}
                            onMouseEnter={() => setHovered(cell.index)}
                            onMouseLeave={() => setHovered(null)}
                            filter={filterAttr}
                        />
                        {state !== 0 && (
                            <circle
                            className={`gb-piece gb-piece-p${state}`}
                            cx={cell.cx}
                            cy={cell.cy}
                            r={HEX_SIZE * 0.37}
                            style={{ pointerEvents: 'none' }}
                            />
                        )}
                        {isHovered && (
                            <circle
                            className={`gb-hint gb-hint-p${currentPlayer}`}
                            cx={cell.cx}
                            cy={cell.cy}
                            r={HEX_SIZE * 0.22}
                            style={{ pointerEvents: 'none' }}
                            />
                        )}
                        </g>
                    );
                })
            }
            </svg>

            <p className="gb-cells-count">
                {CELLS.length} {t('gameboard.tiles')} · N={sideLen} · {gameMode === 'pvp' ? 'PvP' : 'vs Bot'}
            </p>
        </div>
    );
}

export default GameBoard;