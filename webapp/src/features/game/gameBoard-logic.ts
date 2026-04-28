
export type Player = 1 | 2;                // Tipado para el jugador con valor 1 o 2.
export type CellState = 0 | Player;        // Estado de las casillas con valor 0 (neutro) o perteneciente a algún jugador.
export type GameMode = 'pvp' | 'vs-bot';   // Modo de juego, contra bots o contra jugadores.
export type SideType = 'interior' | 'left' | 'right' | 'bottom' | 'corner';    // Tipo de casilla, si es interior o se encuentra en un borde.

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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const HEX_SIZE = 36;   // Tamaño de las casillas del tablero (px).
export const PADDING = 24;    // Distancia mín. entre las casillas y los bordes de su contenedor (px).

export const DIST_X = HEX_SIZE * Math.sqrt(3);    // Distancia horizontal entre los centros de las casillas (px).
export const DIST_Y = HEX_SIZE * 1.5;             // Distancia vertical entre los centros de las casillas (px).

/* ----- TABLERO ----- */
/**
 * Function buildCells(), que se ejecuta al initializarse GameBoard. Crea las casillas de
 * juego según los tamaños especificados para el tablero y las casillas. 
 * 
 * @returns Cell[], una lista de casillas.
 */
export function buildCells(sideLen: number): Cell[]
{
    const cells: Cell[] = [];
    let index = 0;

    for (let row = 0; row < sideLen; row++)
    {
        for (let col = 0; col <= row; col++)
        {
            const by = col;
            const bz = row - col;
            const bx = sideLen - 1 - row;

            const cx = PADDING + HEX_SIZE + col * DIST_X + (bx * DIST_X) / 2;
            const cy = PADDING + HEX_SIZE + row * DIST_Y;

            cells.push({ index, bx, by, bz, row, col, cx, cy });
            index++;
        }
    }

    return cells;
}

/* ----- HELPERS ----- */
/**
 * Function hexPoints(), que toma el centro de una casilla y un radio, devolviendo los
 * vertices del hexágono.
 * 
 * @returns string, las posiciones x e y de cada vértice del hexágono centrado en cx, cy.
 */
export function hexPoints(cx: number, cy: number, r: number): string
{
    return Array.from({ length: 6 }, (_, i) =>
    {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
    }).join(' ');
}

/**
 * Function getSide(), que toma una casilla y devuelve su tipo: interior o borde. 
 * 
 * @returns SideType, el tipo de una casilla.
 */
export function getSide(cell: Cell): SideType
{
    const onLeft = cell.by === 0;
    const onRight = cell.bz === 0;
    const onBottom = cell.bx === 0;

    const count = [onLeft, onRight, onBottom].filter(Boolean).length;

    if (count >= 2) return 'corner';
    if (onLeft) return 'left';
    if (onRight) return 'right';
    if (onBottom) return 'bottom';

    return 'interior';
}

/**
 * Function sideClassFor(), devuelve la clase según el jugador en una casilla.
 * 
 * @return htmlClass, clase del componente.
 */
export function sideClassFor(side: SideType, state: CellState): string
{
    if (state === 1) return 'gb-p1';
    if (state === 2) return 'gb-p2';
    return `gb-${side}`;
}

/* ----- API ----- */
/**
 * Function updateMatch(), que actualiza las estadísticas de un usuario.
 */
export async function updateMatch(username: string, puntos: number, modo: string): Promise<void>
{
    try {
        const res = await fetch(`${API_URL}/api/matches/update`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, puntos, modo }),
        });

        if (!res.ok)
        {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} - ${text}`);
        }
    } catch (err)
    {
        console.error('updateMatch failed:', err);
        throw err;
    }
}
/* ----- YEN PARSING ----- */
/**
 * Function getNestedNumber(), que permite parsear valores del YEN. 
 * 
 * @returns number, el valor deseado como número.
 */
export function getNestedNumber(obj: unknown, path: string[]): number | undefined
{
    let cur: unknown = obj;

    for (const key of path) {
        if (typeof cur === 'object' && cur !== null && key in (cur as Record<string, unknown>)) {
            cur = (cur as Record<string, unknown>)[key];
        } else return undefined;
    }

    return typeof cur === 'number' ? cur : undefined;
}

/**
 * Function getWinnerFromYEN(), que devuelve el valor que representa el jugador que gana o null en caso contrario. 
 * 
 * @returns number, el ganador o null.
 */
export async function getWinnerFromYEN(message: unknown, username: string, gameMode: string): Promise<Player | null>
{
    const id =
        getNestedNumber(message, ['status', 'Finished', 'winner', 'id']) ??
        getNestedNumber(message, ['yen', 'status', 'Finished', 'winner', 'id']);

    if (typeof id !== 'number') return null;

    if (id === 0)
    {
        await updateMatch(username, 10, gameMode);
        return 1;
    }

    if (id === 1)
    {
        await updateMatch(username, -10, gameMode);
        return 2;
    }

    return null;
}

/**
 * Function getCurrentPlayerFromYEN(), que parsea el jugador actual del YEN. 
 * 
 * @returns Player, el tipo del jugador actual.
 */
export function getCurrentPlayerFromYEN(message: unknown): Player
{
    const ongoing = getNestedNumber(message, ['status', 'Ongoing', 'next_player', 'id']);
    if (typeof ongoing === 'number') return ongoing === 1 ? 2 : 1;

    const turn =
        getNestedNumber(message, ['yen', 'turn']) ??
        getNestedNumber(message, ['turn']);

    if (typeof turn !== 'number')
    {
        return 1;
    }

    return turn === 0 ? 1 : 2;
}

/**
 * Function parseBoardFromYEN(), que parsea el estado del tablero del YEN. 
 * 
 * @returns CellState, el estado del tablero.
 */
export function parseBoardFromYEN(yen: unknown, size: number): CellState[]
{
    const board = new Array<CellState>((size * (size + 1)) / 2).fill(0);

    if (!yen || typeof yen !== 'object') return board;

    const layout = (yen as Record<string, unknown>)['layout'];

    let rows: string[] = [];

    if (typeof layout === 'string')
    {
        rows = layout.split('/');
    } else if (Array.isArray(layout))
    {
        rows = layout as string[];
    } else
    {
        rows = [];
    }

    let index = 0;

    for (const row of rows)
    {
        for (const ch of String(row))
        {
            if (ch === 'B') board[index] = 1;
            else if (ch === 'R') board[index] = 2;
            index++;
        }
    }

    return board;
}
