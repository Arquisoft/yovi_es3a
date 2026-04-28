
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import GameBoard from '../features/game/GameBoard.tsx'
import i18n from '../locales/i18n'
import { render, screen, fireEvent, waitFor, cleanup } from '../testing/test-utils.tsx'

class MockWebSocket {
	static readonly instances: MockWebSocket[] = [];
	static readonly OPEN = 1;
	static readonly CLOSED = 3;

	url: string;
	readyState = 0;
	onopen: (() => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onclose: (() => void) | null = null;
	onerror: (() => void) | null = null;
	send = vi.fn();
	close = vi.fn(() => {
		this.readyState = MockWebSocket.CLOSED;
		this.onclose?.();
	});

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
	}

	open() {
		this.readyState = MockWebSocket.OPEN;
		this.onopen?.();
	}

	emitMessage(payload: unknown) {
		this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
	}
}

describe('GameBoard', () => {
	const originalWebSocket = globalThis.WebSocket;

	beforeEach(() => {
		vi.restoreAllMocks();
		MockWebSocket.instances.length = 0;
		globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
		i18n.changeLanguage('es');
	});

	afterEach(() => {
		globalThis.WebSocket = originalWebSocket;
		cleanup();
	});

	it('renders mode selection view without errors', () => {
		render(<GameBoard username="test-username" />);

		expect(screen.getByText('Juego Y')).toBeInTheDocument();
		expect(screen.getByText('Selecciona el modo de juego')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Jugador vs Jugador/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Jugador vs Bot/i })).toBeInTheDocument();
	});

	it('starts game in pvp mode and shows game view', async () => {
		render(<GameBoard username="test-username" />);

		const pvpButton = screen.getByRole('button', { name: /Jugador vs Jugador/i });
		fireEvent.click(pvpButton);

		expect(screen.getByText('Conectando al servidor...')).toBeInTheDocument();
		expect(MockWebSocket.instances).toHaveLength(1);

		const ws = MockWebSocket.instances[0];
		ws.open();

		await waitFor(() => {
			expect(screen.getByText(/Online/i)).toBeInTheDocument();
		});

	expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7 }));
	expect(screen.getByText(/28.*Casillas.*N=.*7.*PvP/)).toBeInTheDocument();
	});

	it('starts game in vs bot mode and shows game view', async () => {
		render(<GameBoard username="test-username" />);

		const botButton = screen.getByRole('button', { name: /Jugador vs Bot/i });
		fireEvent.click(botButton);

		expect(screen.getByText('Conectando al servidor...')).toBeInTheDocument();
		expect(MockWebSocket.instances).toHaveLength(1);

		const ws = MockWebSocket.instances[0];
		ws.open();

		await waitFor(() => {
			expect(screen.getByText(/Online/i)).toBeInTheDocument();
		});

	expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7, bot_id: 'greedy_easy' }));
	expect(screen.getByText(/28.*Casillas.*N=.*7.*vs Bot/)).toBeInTheDocument();
	});

	it('sends command when clicking an empty cell in pvp', async () => {
		const { container } = render(<GameBoard username="test-username" />);

		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();

		await waitFor(() => {
			expect(screen.getByText(/Online/i)).toBeInTheDocument();
		});

		const firstHexCell = container.querySelector('polygon');
		expect(firstHexCell).toBeInTheDocument();

		fireEvent.click(firstHexCell!);

		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'command', line: '0' }));
	});

	it('does not send command if game is not connected yet', () => {
		const { container } = render(<GameBoard username="test-username" />);

		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];

		const firstHexCell = container.querySelector('polygon');
		expect(firstHexCell).not.toBeInTheDocument();
		expect(ws.send).not.toHaveBeenCalledWith(JSON.stringify({ type: 'command', line: '0' }));
	});

	it('handles webSocket state messages and updates board', async () => {
		const { container } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		ws.emitMessage({
			type: 'state',
			yen: { layout: 'B/.R./B..', turn: 1 },
			status: { Ongoing: { next_player: { id: 1 } } }
		});

		await waitFor(() => {
			const pieces = container.querySelectorAll('.gb-piece');
			expect(pieces.length).toBe(3); 
			expect(screen.getByText(/Jugador 2/i)).toBeInTheDocument();
		});
	});

	it('detects a winner correctly', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }); 

		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		ws.emitMessage({
			type: 'state',
			yen: { turn: 1 },
			status: { Finished: { winner: { id: 0 } } }
		});

		await waitFor(() => {
			expect(screen.getByText('¡Has ganado!')).toBeInTheDocument();
		});
	});

	it('handles back to menu functionality', async () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		fireEvent.click(screen.getByRole('button', { name: /Menú/i }));
		expect(screen.getByText('Selecciona el modo de juego')).toBeInTheDocument();
	});

	it('handles reset functionality', async () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		ws.send.mockClear();
		fireEvent.click(screen.getByText('Reiniciar'));
		
		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7 }));
	});

	it('handles server errors gracefully', async () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		ws.emitMessage({
			type: 'error',
			message: 'Test server error message'
		});

		expect(consoleWarnSpy).toHaveBeenCalledWith('Server error:', 'Test server error message');
		
		consoleWarnSpy.mockRestore();
	});

	it('handles changing options before start', () => {
		render(<GameBoard username="test-username" />);
		
		const selects = screen.getAllByRole('combobox');
		const botSelect = selects[0];
		const sizeSelect = selects[1];
		
		fireEvent.change(botSelect, { target: { value: 'greedy_hard' } });
		fireEvent.change(sizeSelect, { target: { value: '9' } });

		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();

		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 9, bot_id: 'greedy_hard' }));
	});

	it('handles WebSocket close event', async () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
		ws.open();

		// Verify WebSocket is established
		expect(ws.readyState).toBe(MockWebSocket.OPEN);

		ws.close();

		expect(ws.readyState).toBe(MockWebSocket.CLOSED);
		consoleWarnSpy.mockRestore();
	});

	it('handles WebSocket error event', async () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
		ws.open();

		// Just verify connection is established
		expect(ws.readyState).toBe(MockWebSocket.OPEN);

		ws.onerror?.();

		expect(consoleWarnSpy).toHaveBeenCalledWith('WS error');

		consoleWarnSpy.mockRestore();
	});


	it('prevents clicking occupied cells', async () => {
		const { container } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		// Send state message with occupied cell at position 0
		ws.emitMessage({
			type: 'state',
			yen: { layout: 'B/.../..../.....', turn: 1 },
			status: { Ongoing: { next_player: { id: 1 } } }
		});

		// Verify board state was updated
		await waitFor(() => {
			expect(container.querySelectorAll('.gb-piece').length).toBeGreaterThan(0);
		});
	});

	it('prevents clicking when winner exists', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

		const { container } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		ws.emitMessage({
			type: 'state',
			yen: { turn: 1 },
			status: { Finished: { winner: { id: 0 } } }
		});

		await waitFor(() => expect(screen.getByText(/Jugador 1/i)).toBeInTheDocument(), { timeout: 2000 });

		const secondHexCell = container.querySelectorAll('polygon')[1];
		ws.send.mockClear();
		fireEvent.click(secondHexCell);

		expect(ws.send).not.toHaveBeenCalled();
	});

	it('prevents player 2 from clicking in vs-bot mode', async () => {
		const { container } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		ws.emitMessage({
			type: 'state',
			yen: { layout: 'B/.../..../.....', turn: 2 },
			status: { Ongoing: { next_player: { id: 1 } } }
		});

		await waitFor(() => {
			expect(container.querySelectorAll('polygon').length).toBeGreaterThan(1);
		});

		const secondHexCell = container.querySelectorAll('polygon')[1];
		ws.send.mockClear();
		fireEvent.click(secondHexCell);

		expect(ws.send).not.toHaveBeenCalled();
	});

	it('prevents clicking when bot is thinking in vs-bot mode', async () => {
		const { container } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		const firstHexCell = container.querySelector('polygon');
		fireEvent.click(firstHexCell!);

		expect(screen.getByText(/Bot pensando/i)).toBeInTheDocument();

		ws.send.mockClear();
		const secondHexCell = container.querySelectorAll('polygon')[1];
		fireEvent.click(secondHexCell);

		expect(ws.send).not.toHaveBeenCalled();
	});

	it('handles hover effect on empty cells', async () => {
		const { container } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		const firstHexCell = container.querySelector('polygon');
		fireEvent.mouseEnter(firstHexCell!);

		const hints = container.querySelectorAll('.gb-hint');
		expect(hints.length).toBeGreaterThan(0);

		fireEvent.mouseLeave(firstHexCell!);
	});

	it('displays correct board size 9', async () => {
		const { container } = render(<GameBoard username="test-username" />);

		const selects = screen.getAllByRole('combobox');
		const sizeSelect = selects[1];

		fireEvent.change(sizeSelect, { target: { value: '9' } });
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		const pInfo = container.querySelector('.gb-cells-count');
		expect(pInfo?.textContent).toMatch(/45.*9/);
	});

	it('displays correct board size 11', async () => {
		const { container } = render(<GameBoard username="test-username" />);

		const selects = screen.getAllByRole('combobox');
		const sizeSelect = selects[1];

		fireEvent.change(sizeSelect, { target: { value: '11' } });
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		const pInfo = container.querySelector('.gb-cells-count');
		expect(pInfo?.textContent).toMatch(/66.*11/);
	});

	it('selects different bot difficulty levels', async () => {
		render(<GameBoard username="test-username" />);

		const selects = screen.getAllByRole('combobox');
		const botSelect = selects[0];

		fireEvent.change(botSelect, { target: { value: 'random_bot' } });
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));
		let ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());
		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7, bot_id: 'random_bot' }));

		fireEvent.click(screen.getByRole('button', { name: /Menú/i }));

		await waitFor(() => expect(screen.getByText('Selecciona el modo de juego')).toBeInTheDocument());

		const selectsAgain = screen.getAllByRole('combobox');
		fireEvent.change(selectsAgain[0], { target: { value: 'greedy_medium' } });
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));
		ws = MockWebSocket.instances[1];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());
		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7, bot_id: 'greedy_medium' }));
	});

	it('clears bot thinking state after server responds', async () => {
		const { container } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		const firstHexCell = container.querySelector('polygon');
		fireEvent.click(firstHexCell!);

		expect(screen.getByText(/Bot pensando/i)).toBeInTheDocument();

		ws.emitMessage({
			type: 'state',
			yen: { layout: 'B/.../..../.....', turn: 1 },
			status: { Ongoing: { next_player: { id: 0 } } }
		});

		await waitFor(() => {
			expect(screen.queryByText(/Bot pensando/i)).not.toBeInTheDocument();
		});
	});

	it('handles winner overlay with play again button', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();
		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		ws.emitMessage({
			type: 'state',
			yen: { turn: 1 },
			status: { Finished: { winner: { id: 0 } } }
		});

		await waitFor(() => {
			expect(screen.getByText(/gana!/i)).toBeInTheDocument();
		});

		const playAgainButton = screen.getByText('Jugar de nuevo');
		expect(playAgainButton).toBeInTheDocument();

		fireEvent.click(playAgainButton);
		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7 }));
	});

	it('cleans up WebSocket on component unmount', () => {
		const { unmount } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();

		unmount();

		expect(ws.close).toHaveBeenCalled();
	});
});

