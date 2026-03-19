import { useState, useEffect } from 'react';
import './GameBoard.css';
import UserStats from '../user-stats/UserStats';

// Tablero del Juego Y — coordenadas baricéntricas (bx, by, bz) con bx+by+bz = N-1
// N=7 → 28 celdas (tamaño estándar del motor Rust)
const N = 7;
const HEX_SIZE = 36;
const PADDING = 28;
const dx = Math.sqrt(3) * HEX_SIZE; // separación horizontal entre centros
const dy = 1.5 * HEX_SIZE;          // separación vertical entre filas

const SVG_WIDTH  = 2 * HEX_SIZE + (N - 1) * dx + 2 * PADDING;
const SVG_HEIGHT = 2 * HEX_SIZE + (N - 1) * dy + 2 * PADDING;

type Player    = 1 | 2;
type CellState = 0 | Player;

interface Cell {
  index: number;
  bx: number; // N-1-row  (distancia al lado inferior)
  by: number; // col       (distancia al lado izquierdo)
  bz: number; // row-col   (distancia al lado derecho)
  row: number;
  col: number;
  cx: number; // centro SVG x
  cy: number; // centro SVG y
}

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  let index = 0;
  for (let row = 0; row < N; row++) {
    for (let col = 0; col <= row; col++) {
      const bx = N - 1 - row;
      const by = col;
      const bz = row - col;
      const cx = PADDING + HEX_SIZE + ((N - 1 - row) * dx) / 2 + col * dx;
      const cy = PADDING + HEX_SIZE + row * dy;
      cells.push({ index, bx, by, bz, row, col, cx, cy });
      index++;
    }
  }
  return cells;
}

const CELLS = buildCells();

/** Polígono hexagonal pointy-top centrado en (cx, cy) con radio r */
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

type SideType = 'interior' | 'left' | 'right' | 'bottom' | 'corner';

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

const API_URL = 'http://localhost:8080'; // Ajusta según el puerto del motor gamey

type GameMode = 'pvp' | 'vs-bot';

interface GameState {
  board: number[];
  currentPlayer: 1 | 2;
  winner: number | null;
  gameOver: boolean;
}

// Función para detectar victoria localmente (BFS)
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

const BOT_DELAY_MS = 800; // Delay en milisegundos para simular "pensamiento"

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
  const [isLoading, setIsLoading] = useState<boolean>(false); // Nuevo estado
  const [showStats, setShowStats] = useState<boolean>(false);

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
        body: JSON.stringify({ size: N })
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
      {/* Renderizar el modal de estadísticas del usuario */}
      {showStats && (
        <UserStats username={username} onClose={() => setShowStats(false)} />
      )}
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
          <button className="gb-back" onClick={() => setShowStats(true)} style={{ backgroundColor: '#4a90e2' }}>
            <i className="bi bi-graph-up"></i> Stats
          </button>
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
        {CELLS.length} celdas · N={N} · {gameMode === 'pvp' ? 'PvP' : 'vs Bot'}
      </p>
    </div>
  );
}

export default GameBoard;