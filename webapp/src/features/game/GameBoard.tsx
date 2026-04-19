import {useEffect, useMemo, useRef, useState} from 'react';
import './GameBoard.css';

/**
 * Empleamos un sistema de coordenadas baricéntricas (bx, by, bz) para representar la posición de las 
 * casillas en el tablero, donde bx + by + bz deberá ser igual a SIDE_LEN - 1.
 * 
 * ----- CONSTANTES DEL TABLERO -----
 */
const HEX_SIZE = 36;   // Tamaño de las casillas del tablero (px).
const PADDING = 24;    // Distancia mín. entre las casillas y los bordes de su contenedor (px).

const DIST_X = HEX_SIZE * Math.sqrt(3);    // Distancia horizontal entre los centros de las casillas (px).
const DIST_Y = HEX_SIZE * 1.5;             // Distancia vertical entre los centros de las casillas (px).

/**
 * ----- OTROS CONSTANTES Y TIPOS -----
 */
const WS_URL = getWebSocketURL();   // Inicialización de la WebSocket para conectar con GameY.

type Player = 1 | 2;                // Tipado para el jugador con valor 1 o 2.
type CellState = 0 | Player;        // Estado de las casillas con valor 0 (neutro) o perteneciente a algún jugador.
type GameMode = 'pvp' | 'vs-bot';   // Modo de juego, contra bots o contra jugadores.
type SideType = 'interior' | 'left' | 'right' | 'bottom' | 'corner';    // Tipo de casilla, si es interior o se encuentra en un borde.

const BOTS = [
    {
        name: "random_bot",
        difficulty: "Fácil",
        description: "Random Movement Bot"
    },
    {
        name: "greedy_easy",
        difficulty: "Fácil",
        description: "Starter Greedy Bot"
    },
    {
        name: "greedy_medium",
        difficulty: "Media",
        description: "Experienced Greedy Bot!"
    },
    {
        name: "greedy_hard",
        difficulty: "Difícil",
        description: "Advanced Greedy Bot!!"
    },
    {
        name: "random_strategy_bot",
        difficulty: "Variable",
        description: "Variable Strategy Bot"
    }];

/**
 * Interfaz Cell, que define las características de una casilla del tablero.
 */
interface Cell {
  index: number;    // Índice de la casilla.
  bx: number;       // Distancia a la base del tablero.
  by: number;       // Distancia al lado izquierdo.
  bz: number;       // Distancia al lado derecho.
  row: number;      // Fila al que pertenece.
  col: number;      // Columna al que pertenece.
  cx: number;       // Centro SVG_x.
  cy: number;       // Centro SVG_y.
}

/**
 * Function buildCells(), que se ejecuta al initializarse GameBoard. Crea las casillas de
 * juego según los tamaños especificados para el tablero y las casillas. 
 * 
 * @returns Cell[], una lista de casillas.
 */
function buildCells(sideLen: number): Cell[] {

  const cells: Cell[] = []; let index = 0;

  for (let row = 0; row < sideLen; row++) {
    for (let col = 0; col <= row; col++) {

      // Coordenadas de la casilla.
      const by = col;
      const bz = row - col;
      const bx = sideLen - 1 - row;

      // Centro SVG de la casilla.
      const cx = PADDING + HEX_SIZE + col * DIST_X + (bx * DIST_X) / 2;
      const cy = PADDING + HEX_SIZE + row * DIST_Y;

      cells.push({ index, bx, by, bz, row, col, cx, cy }); index++;
    }
  }

  return cells;
}

/**
 * Funciones auxiliares para manejar la GameBoard.
 */

/** Polígono hexagonal pointy-top centrado en (cx, cy) con radio r */
/**
 * 
 */
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;  
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

/**
 * 
 * 
 * @param cell 
 * @returns 
 */
function getSide(cell: Cell): SideType {
  const onLeft   = cell.by === 0;
  const onRight  = cell.bz === 0;
  const onBottom = cell.bx === 0;
  const count = (onLeft ? 1 : 0) + (onRight ? 1 : 0) + (onBottom ? 1 : 0);
  if (count >= 2) return 'corner';
  if (onLeft)   return 'left';
  if (onRight)  return 'right';
  if (onBottom) return 'bottom';
  return 'interior';
}

// ── YEN parser ────────────────────────────────────────────────────────────────
// YEN layout field is an array of strings, one per row.
// Each char: '.' = empty, '1' = player 1, '2' = player 2.


async function updateMatch(username: string, puntos: number, modo: string) {
  await fetch("http://localhost:3000/api/matches/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, puntos, modo })
  });
}

// Detect winner from YEN status field
async function getWinnerFromYEN(message: any, username:string,
     gameMode: string): Promise<Player | null> {

    if (!message) return null;

    // Buscar status en el mensaje principal
    if (message.status?.Finished) {
        const id = message.status.Finished?.winner?.id;
        
        if (id === 0) {
            await updateMatch(username, +10, gameMode);
            return 1;
        }
        
        if (id === 1) 
        {
            await updateMatch(username, -10, gameMode);
            return 2;
        }
    }

    // Fallback: check YEN si existe
    const yen = message.yen;
    if (yen?.status?.Finished) {
        const id = yen.status.Finished?.winner?.id;
        
        if (id === 0)
        {
            await updateMatch(username, +10, gameMode);
            return 1;
        }
        
        if (id === 1) 
        {
            await updateMatch(username, -10, gameMode);
            return 2;
        }
    }

    return null;
}

// Detect whose turn it is from YEN
function getCurrentPlayerFromYEN(message: any): Player {
    if (!message) return 1;

    const yen = message.yen || message;

    // Check status Ongoing
    if (message.status?.Ongoing) {
        const id = message.status.Ongoing?.next_player?.id;
        if (id === 1) return 2;
    }

    // Usar turn field de YEN como fallback (0=player1, 1=player2)
    if (yen?.turn !== undefined) {
        return yen.turn === 0 ? 1 : 2;
    }
    return 1;
}

// Construct WebSocket URL - resolved at runtime, not at build time
function getWebSocketURL(): string {
    // In production/Docker, all services are on the same network
    // Use the same hostname as the webapp and port 4000 for gamey
    const protocol = globalThis.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = globalThis.location.hostname;
    const wsUrl = `${protocol}://${host}:4000/ws`;
    console.log('WebSocket URL:', wsUrl);
    return wsUrl;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function GameBoard({username}: { username: string }) {
    const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
    const [hovered, setHovered] = useState<number | null>(null);
    const [winner, setWinner] = useState<Player | null>(null);
    const [gameMode, setGameMode] = useState<GameMode>('pvp');
    const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
    const [connected, setConnected] = useState<boolean>(false);
    const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
    const [botID, setBotID] = useState<string>("greedy_easy");
    const [sideLen, setSideLen] = useState<number>(7);

    const SVG_WIDTH = useMemo(
        () => 2 * HEX_SIZE + (sideLen - 1) * DIST_X + 2 * PADDING, [sideLen]);

    const SVG_HEIGHT = useMemo(
        () => 2 * HEX_SIZE + (sideLen - 1) * DIST_Y + 2 * PADDING, [sideLen]);

    const wsRef = useRef<WebSocket | null>(null);
    // track last move sender to detect bot reply
    const awaitingBotRef = useRef<boolean>(false);

    const CELLS = useMemo(() => buildCells(sideLen), [sideLen]);
    const [board, setBoard] = useState<CellState[]>(() => new Array(CELLS.length).fill(0));

    function parseBoardFromYEN(yen: any): CellState[] {
        const board: CellState[] = new Array(CELLS.length).fill(0);
        if (!yen?.layout) return board;

        const rows: string[] =
            typeof yen.layout === "string"
                ? yen.layout.split('/')
                : Array.isArray(yen.layout)
                    ? yen.layout
                    : [];
                    
        let index = 0;
        for (const element of rows) {
            const line = element;
            for (const element of line) {
                const ch = element

                if (ch === 'B') board[index] = 1;
                else if (ch === 'R') board[index] = 2;
                index++;
            }
        }
        return board;
    }   

    // ── WebSocket lifecycle ──────────────────────────────────────────────────
    function connectWS(mode: GameMode) {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            setConnected(true);
            const msg: any = {
                type: 'start',
                size: sideLen
            };
            if (mode === 'vs-bot') 
            {
                msg.bot_id = botID;
            }

            ws.send(JSON.stringify(msg));
        };

        ws.onmessage = async (ev) => {
            try {
                const v = JSON.parse(ev.data);

                if (v.type === 'state' && v.yen) {
                    const newBoard = parseBoardFromYEN(v.yen);
                    const newWinner = await getWinnerFromYEN(v, username, gameMode);
                    const newPlayer = getCurrentPlayerFromYEN(v);

                    setBoard(newBoard);
                    setWinner(newWinner);
                    setCurrentPlayer(newPlayer);

                    // Bot reply has arrived
                    if (awaitingBotRef.current) {
                        awaitingBotRef.current = false;
                        setIsBotThinking(false);
                    }
                }

                if (v.type === 'error') {
                    console.warn('Server error:', v.message);
                    setIsBotThinking(false);
                    awaitingBotRef.current = false;
                }
            } catch (e) {
                console.warn('Bad JSON from server', e);
            }
        };

        ws.onclose = () => {
            setConnected(false);
            setIsBotThinking(false);
            awaitingBotRef.current = false;
            wsRef.current = null;
        };

        ws.onerror = () => {
            console.warn('WS error');
            setIsBotThinking(false);
        };

        wsRef.current = ws;
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsRef.current?.close();
        };
    }, []);

    // ── Game actions ─────────────────────────────────────────────────────────
    function sendCommand(line: string) {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({type: 'command', line}));
    }

    function handleClick(index: number) {
        if (!connected) return;
        if (board[index] !== 0 || winner || isBotThinking) return;
        if (gameMode === 'vs-bot' && currentPlayer === 2) return;

        // In vs-bot mode, flag that we're waiting for bot reply
        if (gameMode === 'vs-bot') {
            awaitingBotRef.current = true;
            setIsBotThinking(true);
        }

        sendCommand(String(index));
    }

    function handleReset() {
        setBoard(new Array(CELLS.length).fill(0));
        setCurrentPlayer(1);
        setWinner(null);
        setHovered(null);
        setIsBotThinking(false);
        awaitingBotRef.current = false;

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const msg: any = {type: 'start', size: sideLen};
            if (gameMode === 'vs-bot') msg.bot_id = botID;
            wsRef.current.send(JSON.stringify(msg));
        } else {
            connectWS(gameMode);
        }
    }

    function handleBackToMenu() {
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

    function handleStartGame(mode: GameMode) {
        setGameMode(mode);
        setIsGameStarted(true);
        setBoard(new Array(CELLS.length).fill(0));
        setCurrentPlayer(1);
        setWinner(null);
        connectWS(mode);
    }

    // ── Render ────────────────────────────────────────────────────────────────────────────────────────────
    if (!isGameStarted) {
        return (
            <div className="gb-wrapper">
                <div className="gb-mode-select">
                    <h2 className="gb-mode-title">Juego Y</h2>
                    <p className="gb-mode-subtitle">Selecciona el modo de juego</p>
                    
                    <div className="gb-mode-cards">
                        <button  className="gb-card" onClick={() => handleStartGame('pvp')}>
                            <div className="gb-card-icon">👥</div>
                            <div className="gb-card-title">Jugador vs Jugador</div>
                            <div className="gb-card-desc">Juega contra un Amigo en Local</div>
                        </button >
                        <button  className="gb-card" onClick={() => handleStartGame('vs-bot')}>
                            <div className="gb-card-icon">🤖</div>
                            <div className="gb-card-title">Jugador vs Bot</div>
                            <div className="gb-card-desc">Desafía a un Bot Inteligente</div>
                        </button>
                    </div>

                    <div className="gb-options-panel">
                        <h2>Opciones de Partida</h2>

                        <div className="gb-option-row">
                            <div className="gb-select-block">
                                <label>Dificultad del Bot:</label>

                                <select value={botID} onChange={(e) => setBotID(e.target.value)}>
                                    {BOTS.map(bot => (
                                        <option key={bot.name} value={bot.name}>
                                            {bot.difficulty.toUpperCase()} — {bot.description}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="gb-select-block">
                                <label>Tamaño del Tablero:</label>

                                <select value={sideLen} onChange={(e) => setSideLen(Number(e.target.value))}>
                                    <option value={7}>7 (28 Casillas)</option>
                                    <option value={9}>9 (45 Casillas)</option>
                                    <option value={11}>11 (66 Casillas)</option>
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
                    <p className="gb-loading-text">Conectando al servidor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="gb-wrapper">
            {winner && (
                <div className="gb-winner-overlay">
                    <div className={`gb-winner-modal player${winner}`}>
                        <div className="gb-winner-icon">
                            {gameMode === 'vs-bot' && winner === 1 ? '🏆' :
                                gameMode === 'vs-bot' && winner === 2 ? '🤖' : '🎉'}
                        </div>
                        <h2 className="gb-winner-title">
                            {gameMode === 'vs-bot'
                                ? (winner === 1 ? '¡Has ganado!' : '¡El bot gana!')
                                : `¡Jugador ${winner} gana!`}
                        </h2>
                        <p className="gb-winner-subtitle">
                            {winner === 1
                                ? 'Rojo ha conectado los tres lados'
                                : 'Azul ha conectado los tres lados'}
                        </p>
                        <div className="gb-winner-actions">
                            <button className="gb-winner-btn" onClick={handleReset}>
                                Jugar de nuevo
                            </button>
                            <button className="gb-winner-btn secondary" onClick={handleBackToMenu}>
                                Cambiar modo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="gb-header">
                <button className="gb-back" onClick={handleBackToMenu}>← Menú</button>
                <div className={`gb-turn player${currentPlayer} ${isBotThinking ? 'thinking' : ''}`}>
                    <span className="gb-dot"/>
                    {isBotThinking ? (
                        <span>Bot pensando<span className="gb-thinking-dots"></span></span>
                    ) : (
                        <span>
              Turno:{' '}
                            {gameMode === 'vs-bot'
                                ? currentPlayer === 1 ? 'Tú' : 'Bot'
                                : `Jugador ${currentPlayer}`}
            </span>
                    )}
                </div>
                <span className={`gb-status ${connected ? 'online' : 'offline'}`}>
          {connected ? '🟢 Online' : '🔴 Offline'}
        </span>
                <button className="gb-reset" onClick={handleReset}>Reiniciar</button>
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
                        'gb-hex',
                        state === 1 ? 'gb-p1' :
                            state === 2 ? 'gb-p2' :
                                `gb-${side}`,
                        isHovered ? 'gb-hover' : '',
                    ].filter(Boolean).join(' ');

                    return (
                        <g key={cell.index}>
                            <polygon
                                className={cellClass}
                                points={hexPoints(cell.cx, cell.cy, HEX_SIZE - 2)}
                                onClick={() => handleClick(cell.index)}
                                onMouseEnter={() => setHovered(cell.index)}
                                onMouseLeave={() => setHovered(null)}
                                filter={state === 1 ? 'url(#glow1)' : state === 2 ? 'url(#glow2)' : undefined}
                            />
                            {state !== 0 && (
                                <circle
                                    className={`gb-piece gb-piece-p${state}`}
                                    cx={cell.cx}
                                    cy={cell.cy}
                                    r={HEX_SIZE * 0.37}
                                    style={{pointerEvents: 'none'}}
                                />
                            )}
                            {isHovered && (
                                <circle
                                    className={`gb-hint gb-hint-p${currentPlayer}`}
                                    cx={cell.cx}
                                    cy={cell.cy}
                                    r={HEX_SIZE * 0.22}
                                    style={{pointerEvents: 'none'}}
                                />
                            )}
                        </g>
                    );
                })}
            </svg>

            <p className="gb-cells-count">
                {CELLS.length} celdas · N={sideLen} · {gameMode === 'pvp' ? 'PvP' : 'vs Bot'}
            </p>
        </div>
    );
}

export default GameBoard;