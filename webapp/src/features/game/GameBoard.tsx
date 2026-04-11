import {useEffect, useRef, useState} from 'react';
import './GameBoard.css';

/**
 * Empleamos un sistema de coordenadas baricéntricas (bx, by, bz) para representar la posición de las 
 * casillas en el tablero, donde bx + by + bz deberá ser igual a SIDE_LEN - 1.
 * 
 * ----- CONSTANTES DEL TABLERO -----
 */
const SIDE_LEN = 7;    // Tamaño del tablero, medido como el número de casillas en un lado del triángulo.
const HEX_SIZE = 36;   // Tamaño de las casillas del tablero (px).
const PADDING = 24;    // Distancia mín. entre las casillas y los bordes de su contenedor (px).

const DIST_X = HEX_SIZE * Math.sqrt(3);    // Distancia horizontal entre los centros de las casillas (px).
const DIST_Y = HEX_SIZE * 1.5;             // Distancia vertical entre los centros de las casillas (px).
const CELLS = buildCells();                // Inicialización de las casillas del tablero.

const SVG_WIDTH  = 2 * HEX_SIZE + (SIDE_LEN - 1) * DIST_X + 2 * PADDING;   // Anchura mín. del contenedor del tablero (px).
const SVG_HEIGHT = 2 * HEX_SIZE + (SIDE_LEN - 1) * DIST_Y + 2 * PADDING;   // Altura mín. del contenedor del tablero (px).


/**
 * ----- OTROS CONSTANTES Y TIPOS -----
 */
const WS_URL = getWebSocketURL();           // Inicialización de la WebSocket para conectar con GameY.

type Player = 1 | 2;                // Tipado para el jugador con valor 1 o 2.
type CellState = 0 | Player;        // Estado de las casillas con valor 0 (neutro) o perteneciente a algún jugador.
type GameMode = 'pvp' | 'vs-bot';   // Modo de juego, contra bots o contra jugadores.
type SideType = 'interior' | 'left' | 'right' | 'bottom' | 'corner';    // Tipo de casilla, si es interior o se encuentra en un borde.





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
function buildCells(): Cell[] {

  const cells: Cell[] = []; let index = 0;

  for (let row = 0; row < SIDE_LEN; row++) {
    for (let col = 0; col <= row; col++) {

      // Coordenadas de la casilla.
      const by = col;
      const bz = row - col;
      const bx = SIDE_LEN - 1 - row;

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
    for (let row = 0; row < rows.length; row++) {
        const line = rows[row];
        for (let col = 0; col < line.length; col++) {
            const ch = line[col];

            if (ch === 'B') board[index] = 1;
            else if (ch === 'R') board[index] = 2;
            index++;
        }
    }
    return board;
}

// Detect winner from YEN status field
function getWinnerFromYEN(message: any): Player | null {
    if (!message) return null;

    // Buscar status en el mensaje principal
    if (message.status && message.status.Finished) {
        const id = message.status.Finished?.winner?.id;
        if (id === 0) return 1;
        if (id === 1) return 2;
    }

    // Fallback: check YEN si existe
    const yen = message.yen;
    if (yen && yen.status && yen.status.Finished) {
        const id = yen.status.Finished?.winner?.id;
        if (id === 0) return 1;
        if (id === 1) return 2;
    }
    return null;
}

// Detect whose turn it is from YEN
function getCurrentPlayerFromYEN(message: any): Player {
    if (!message) return 1;

    const yen = message.yen || message;

    // Check status Ongoing
    if (message.status && message.status.Ongoing) {
        const id = message.status.Ongoing?.next_player?.id;
        if (id === 1) return 2;
    }

    // Usar turn field de YEN como fallback (0=player1, 1=player2)
    if (yen && yen.turn !== undefined) {
        return yen.turn === 0 ? 1 : 2;
    }
    return 1;
}

// Construct WebSocket URL - resolved at runtime, not at build time
function getWebSocketURL(): string {
    // In production/Docker, all services are on the same network
    // Use the same hostname as the webapp and port 4000 for gamey
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const wsUrl = `${protocol}://${host}:4000/ws`;
    console.log('WebSocket URL:', wsUrl);
    return wsUrl;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function GameBoard({username}: { username: string }) {
    const [board, setBoard] = useState<CellState[]>(() => new Array(CELLS.length).fill(0));
    const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
    const [hovered, setHovered] = useState<number | null>(null);
    const [winner, setWinner] = useState<Player | null>(null);
    const [gameMode, setGameMode] = useState<GameMode>('pvp');
    const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
    const [connected, setConnected] = useState<boolean>(false);
    const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
    const [, setShowStats] = useState<boolean>(false);
    //const [renderText, setRenderText] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    // track last move sender to detect bot reply
    const awaitingBotRef = useRef<boolean>(false);

    // ── WebSocket lifecycle ──────────────────────────────────────────────────
    function connectWS(mode: GameMode) {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            setConnected(true);
            const msg: any = {type: 'start', size: SIDE_LEN};
            if (mode === 'vs-bot') msg.bot_id = 'random_bot';
            ws.send(JSON.stringify(msg));
        };

        ws.onmessage = (ev) => {
            try {
                const v = JSON.parse(ev.data);

                if (v.type === 'state' && v.yen) {
                    const newBoard = parseBoardFromYEN(v.yen);
                    const newWinner = getWinnerFromYEN(v);
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
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
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

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const msg: any = {type: 'start', size: SIDE_LEN};
            if (gameMode === 'vs-bot') msg.bot_id = 'random_bot';
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

    // ── Render ───────────────────────────────────────────────────────────────
    if (!isGameStarted) {
        return (
            <div className="gb-wrapper">
                <div className="gb-mode-select">
                    <h2 className="gb-mode-title">Juego Y</h2>
                    <p className="gb-mode-subtitle">Selecciona el modo de juego</p>
                    <div className="gb-mode-buttons">
                        <button
                            className="gb-mode-btn pvp"
                            onClick={() => handleStartGame('pvp')}
                        >
                            <span className="gb-mode-icon">👥</span>
                            <span className="gb-mode-label">Jugador vs Jugador</span><br/>
                            <span className="gb-mode-desc">Juega contra un amigo</span>
                        </button>
                        <button
                            className="gb-mode-btn vs-bot"
                            onClick={() => handleStartGame('vs-bot')}
                        >
                            <span className="gb-mode-icon">🤖</span>
                            <span className="gb-mode-label">Jugador vs Bot</span><br/>
                            <span className="gb-mode-desc">Juega contra el bot random</span>
                        </button>
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
                <button
                    className="gb-back"
                    onClick={() => setShowStats(true)}
                    style={{marginLeft: '10px', backgroundColor: '#4a90e2'}}
                >
                    Estadísticas del usuario
                </button>
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
                {CELLS.length} celdas · N={SIDE_LEN} · {gameMode === 'pvp' ? 'PvP' : 'vs Bot'}
            </p>
        </div>
    );
}

export default GameBoard;
