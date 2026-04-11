import { useState, useEffect } from 'react';
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
const API_URL = 'http://localhost:8080';  // URL de la API para conectar con GameY.
const BOT_DELAY_MS = 600;                 // Tiempo de espera entre movimientos del bot (ms).

type Player = 1 | 2;                // Tipado para el jugador con valor 1 o 2.
type CellState = 0 | Player;        // Estado de las casillas con valor 0 (neutro) o perteneciente a algún jugador.
type GameMode = 'pvp' | 'vs-bot';   // Modo de juego, contra bots o contra jugadores.

type SideType = 'interior' | 'left' | 'right' | 'bottom' | 'corner';    // Tipo de casilla, si es interior o se encuentra en un borde.


/**
 * Interfaz GameState, que representa el estado general del juego.
 */
interface GameState {
  board: number[];          // El estado del tablero en notación YEN.
  currentPlayer: 1 | 2;     // El jugador activo.
  winner: number | null;    // Si hay un ganador.
  gameOver: boolean;        // Si el juego ha finalizado.
}

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













// TODO: Continuar Refactorización

/**
 * Función checkWinner(), emplea emplea un algoritmo Breadth-First Seach (BFS) para 
 * detectar las victorias localmente.
 * 
 * @param board 
 * @param player 
 * @returns 
 */
function checkWinner(board: CellState[], player: Player): boolean {
  // El jugador gana si conecta los tres lados del triángulo
  // Usamos Union-Find para verificar conexión entre los tres lados
  
  const playerCells = CELLS.filter((_, idx) => board[idx] === player);
  if (playerCells.length < 3) return false;

  // Construir grafo de adyacencias
  const getNeighborIndices = (cell: Cell): number[] => {
    const neighbors: number[] = [];
    for (const other of CELLS) {
      const dbx = Math.abs(cell.bx - other.bx);
      const dby = Math.abs(cell.by - other.by);
      const dbz = Math.abs(cell.bz - other.bz);
      // Celdas adyacentes difieren en exactamente 1 en dos coordenadas
      if ((dbx === 1 && dby === 1 && dbz === 0) ||
          (dbx === 1 && dby === 0 && dbz === 1) ||
          (dbx === 0 && dby === 1 && dbz === 1)) {
        neighbors.push(other.index);
      }
    }
    return neighbors;
  };

  // BFS para encontrar componentes conectados del jugador
  const visited = new Set<number>();
  const components: Set<number>[] = [];

  for (const cell of playerCells) {
    if (visited.has(cell.index)) continue;
    
    const component = new Set<number>();
    const queue = [cell.index];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.add(current);
      
      for (const neighborIdx of getNeighborIndices(CELLS[current])) {
        if (board[neighborIdx] === player && !visited.has(neighborIdx)) {
          queue.push(neighborIdx);
        }
      }
    }
    components.push(component);
  }

  // Verificar si algún componente toca los tres lados
  for (const component of components) {
    let touchesLeft = false;
    let touchesRight = false;
    let touchesBottom = false;

    for (const idx of component) {
      const cell = CELLS[idx];
      if (cell.by === 0) touchesLeft = true;   // Lado izquierdo
      if (cell.bz === 0) touchesRight = true;  // Lado derecho
      if (cell.bx === 0) touchesBottom = true; // Lado inferior
    }

    if (touchesLeft && touchesRight && touchesBottom) {
      return true;
    }
  }

  return false;
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
 */
function GameBoard({  username }: { username: string }) {
  const [board, setBoard] = useState<CellState[]>(() => new Array(CELLS.length).fill(0));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [hovered, setHovered] = useState<number | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Inicializar juego con el motor
  useEffect(() => {
    if (isGameStarted) {
      startNewGame();
    }
  }, [isGameStarted]);

  // Turno del bot
  useEffect(() => {
    if (gameMode === 'vs-bot' && currentPlayer === 2 && !winner && isGameStarted && !isLoading) {
      makeBotMove();
    }
  }, [currentPlayer, gameMode, winner, isGameStarted, isLoading]);

  async function startNewGame() {
    setIsLoading(true); // Iniciar carga
    
    // Resetear el tablero primero
    setBoard(new Array(CELLS.length).fill(0));
    setCurrentPlayer(1);
    setWinner(null);
    setHovered(null);
    
    try {
      const response = await fetch(`${API_URL}/game/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: SIDE_LEN })
      });
      const data = await response.json();
      setGameId(data.gameId);
      setIsOnline(true);
    } catch (error) {
      console.error('Error iniciando juego, usando modo offline:', error);
      setIsOnline(false);
    } finally {
      setIsLoading(false); // Finalizar carga
    }
  }

  async function makeBotMove() {
    if (!isOnline || !gameId) {
      makeLocalBotMove();
      return;
    }

    setIsBotThinking(true);

    // Añadir delay para simular pensamiento
    await new Promise(resolve => setTimeout(resolve, BOT_DELAY_MS));

    try {
      const response = await fetch(`${API_URL}/game/${gameId}/bot-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: 2 })
      });

      const data = await response.json();
      
      if (data.position) {
        const cellIndex = CELLS.findIndex(
          c => c.bx === data.position.bx && c.by === data.position.by && c.bz === data.position.bz
        );

        if (cellIndex !== -1) {
          const next = [...board];
          next[cellIndex] = 2;
          setBoard(next);

          if (data.winner) {
            setWinner(data.winner as Player);
            /* Añadir winner */
          } else if (checkWinner(next, 2)) {
            setWinner(2);
          } else {
            setCurrentPlayer(1);
          }
        }
      }
    } catch (error) {
      console.error('Error al hacer movimiento del bot:', error);
      makeLocalBotMove();
    } finally {
      setIsBotThinking(false);
    }
  }

  function makeLocalBotMove() {
    const emptyCells = CELLS.filter((_, idx) => board[idx] === 0);
    if (emptyCells.length === 0) return;

    setIsBotThinking(true);

    // Delay para el bot local también
    setTimeout(() => {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const next = [...board];
      next[randomCell.index] = 2;
      setBoard(next);

      if (checkWinner(next, 2)) {
        setWinner(2);
      } else {
        setCurrentPlayer(1);
      }
      setIsBotThinking(false);
    }, BOT_DELAY_MS);
  }

  async function handleClick(index: number) {
    // Añadir isLoading a la condición
    if (board[index] !== 0 || winner || isBotThinking || isLoading) return;
    if (gameMode === 'vs-bot' && currentPlayer === 2) return; // No permitir clicks durante turno del bot

    const next = [...board];
    next[index] = currentPlayer;

    if (isOnline && gameId) {
      try {
        const cell = CELLS[index];
        const response = await fetch(`${API_URL}/game/${gameId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player: currentPlayer,
            position: { bx: cell.bx, by: cell.by, bz: cell.bz }
          })
        });

        const data: GameState = await response.json();
        setBoard(next);

        if (data.winner) {
          setWinner(data.winner as Player);
          return;
        }
      } catch (error) {
        console.error('Error al hacer movimiento, usando verificación local:', error);
        setIsOnline(false);
      }
    }

    // Verificación local de victoria
    setBoard(next);
    
    if (checkWinner(next, currentPlayer)) {
      setWinner(currentPlayer);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  }

  function handleReset() {
    startNewGame();
  }

  function handleBackToMenu() {
    setIsGameStarted(false);
    setBoard(new Array(CELLS.length).fill(0));
    setCurrentPlayer(1);
    setWinner(null);
    setHovered(null);
  }

  // Pantalla de selección de modo
  if (!isGameStarted) {
    return (
      <div className="gb-wrapper">
        <div className="gb-mode-select">
          <h2 className="gb-mode-title">Juego Y</h2>
          <p className="gb-mode-subtitle">Selecciona el modo de juego</p>
          
          <div className="gb-mode-buttons">
            <button 
              className="gb-mode-btn pvp flex-grow-1"
              onClick={() => { setGameMode('pvp'); setIsGameStarted(true); }}
            >
              <span className="gb-mode-icon">👥</span>
              <span className="gb-mode-label">Jugador vs Jugador</span><br/>
              <span className="gb-mode-desc">Juega contra un amigo</span>
            </button>
            
            <button 
              className="gb-mode-btn vs-bot flex-grow-1"
              onClick={() => { setGameMode('vs-bot'); setIsGameStarted(true); }}
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

  // Pantalla de carga
  if (isLoading) {
    return (
      <div className="gb-wrapper">
        <div className="gb-loading">
          <div className="gb-spinner"></div>
          <p className="gb-loading-text">Preparando el juego...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gb-wrapper">
      {/* Modal de victoria */}
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
              {winner === 1 ? 'Rojo ha conectado los tres lados' : 'Azul ha conectado los tres lados'}
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

      {/* Cabecera */}
      <div className="gb-header">
        <div className="d-flex gap-2">
          <button className="gb-back" onClick={handleBackToMenu}>← Menú</button>
        </div>

        <div className={`gb-turn player${currentPlayer} ${isBotThinking ? 'thinking' : ''}`}>
          <span className="gb-dot" />
          <span>{isBotThinking ? '...' : (currentPlayer === 1 ? 'P1' : 'P2')}</span>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <span className={`gb-status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢' : '🔴'}
          </span>
          <button className="gb-reset" onClick={handleReset}>Reiniciar</button>
        </div>
      </div>

      {/* Tablero SVG */}
      <svg
        className={`gb-svg ${isBotThinking ? 'gb-disabled' : ''}`}
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      >
        <defs>
          <filter id="glow1">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {CELLS.map(cell => {
          const state    = board[cell.index];
          const side     = getSide(cell);
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
        })}
      </svg>

      <p className="gb-cells-count">
        {CELLS.length} celdas · N={SIDE_LEN} · {gameMode === 'pvp' ? 'PvP' : 'vs Bot'}
      </p>
    </div>
  );
}

export default GameBoard;