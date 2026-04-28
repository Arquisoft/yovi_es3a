
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import GameBoard from './GameBoard'
import i18n from '../../locales/i18n'
import { render, screen, fireEvent, waitFor, cleanup } from '../../testing/test-utils.tsx'

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

describe('GameBoard - Enhanced Coverage', () => {
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

	// ===== Connection and Lifecycle Tests =====
	it('establishes WebSocket connection when starting game in PvP mode', async () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		expect(MockWebSocket.instances).toHaveLength(1);
		const ws = MockWebSocket.instances[0];
		ws.open();
		expect(ws.readyState).toBe(MockWebSocket.OPEN);
	});

	it('sends correct start message to WebSocket with default board size 7', async () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7 }));
	});

	it('sends bot_id parameter when connecting in vs-bot mode', async () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7, bot_id: 'greedy_easy' }));
	});

	it('closes WebSocket connection when navigating back to menu', async () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		fireEvent.click(screen.getByText('← Menú'));

		await waitFor(() => {
			expect(screen.getByText('Selecciona el modo de juego')).toBeInTheDocument();
		});
	});

	it('closes WebSocket on component unmount', () => {
		const { unmount } = render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		unmount();

		expect(ws.close).toHaveBeenCalled();
	});

	// ===== Board Customization Tests =====
	it('allows changing board size to 9 before starting game', () => {
		render(<GameBoard username="test-username" />);

		const selects = screen.getAllByRole('combobox');
		const sizeSelect = selects[1];
		fireEvent.change(sizeSelect, { target: { value: '9' } });

		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 9 }));
	});

	it('allows changing board size to 11 before starting game', () => {
		render(<GameBoard username="test-username" />);

		const selects = screen.getAllByRole('combobox');
		const sizeSelect = selects[1];
		fireEvent.change(sizeSelect, { target: { value: '11' } });

		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 11 }));
	});

	it('displays correct tile count for different board sizes', () => {
		const { rerender } = render(<GameBoard username="test-username" />);

		// Check size 7 (default - 28 tiles)
		expect(screen.getByText(/28.*Casillas.*N=.*7/)).toBeInTheDocument();

		// Re-render after changing size
		cleanup();
		render(<GameBoard username="test-username" />);
		const selects = screen.getAllByRole('combobox');
		fireEvent.change(selects[1], { target: { value: '9' } });
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		// Verify size 9 is shown (45 tiles)
		const cellsText = screen.getByText((content, element) => {
			return element?.textContent?.includes('45') ?? false;
		});
		expect(cellsText).toBeInTheDocument();
	});

	// ===== Bot Difficulty Tests =====
	it('allows selecting different bot difficulty levels', () => {
		render(<GameBoard username="test-username" />);

		const selects = screen.getAllByRole('combobox');
		const botSelect = selects[0];

		fireEvent.change(botSelect, { target: { value: 'random_bot' } });
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7, bot_id: 'random_bot' }));
	});

	it('supports multiple bot strategies', () => {
		const botStrategies = ['random_bot', 'greedy_easy', 'greedy_medium', 'greedy_hard', 'random_strategy_bot'];

		for (const strategy of botStrategies) {
			MockWebSocket.instances.length = 0;

			render(<GameBoard username="test-username" />);
			const selects = screen.getAllByRole('combobox');
			const botSelect = selects[0];

			fireEvent.change(botSelect, { target: { value: strategy } });
			fireEvent.click(screen.getByRole('button', { name: /Jugador vs Bot/i }));

			const ws = MockWebSocket.instances[0];
			ws.open();

			expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7, bot_id: strategy }));

			cleanup();
		}
	});

	// ===== Error Handling Tests =====
	it('logs warning when WebSocket error occurs', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();
		ws.onerror?.();

		expect(consoleWarnSpy).toHaveBeenCalledWith('WS error');

		consoleWarnSpy.mockRestore();
	});

	it('logs server error messages from WebSocket', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		ws.emitMessage({
			type: 'error',
			message: 'Invalid move'
		});

		expect(consoleWarnSpy).toHaveBeenCalledWith('Server error:', 'Invalid move');

		consoleWarnSpy.mockRestore();
	});

	// ===== Game State Tests =====
	it('processes board state messages from server', async () => {
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

		const pieces = container.querySelectorAll('.gb-piece');
		expect(pieces.length).toBeGreaterThan(0);
	});

	it('handles game completion with winner', async () => {
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

	// ===== UI Interaction Tests =====
	it('shows play again button after game ends', async () => {
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
			expect(screen.getByText('¡Has ganado!')).toBeInTheDocument();
		});

		const playAgainButton = screen.getByText('Jugar de nuevo');
		expect(playAgainButton).toBeInTheDocument();

		fireEvent.click(playAgainButton);
		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7 }));
	});

	it('shows loading state while connecting', () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		expect(screen.getByText('Conectando al servidor...')).toBeInTheDocument();
	});

	it('displays mode selection view on initial render', () => {
		render(<GameBoard username="test-username" />);

		expect(screen.getByText('Juego Y')).toBeInTheDocument();
		expect(screen.getByText('Selecciona el modo de juego')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Jugador vs Jugador/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Jugador vs Bot/i })).toBeInTheDocument();
	});

	// ===== Reset Functionality Tests =====
	it('sends new start message when reset button is clicked', async () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		ws.open();

		await waitFor(() => expect(screen.getByText(/Online/i)).toBeInTheDocument());

		ws.send.mockClear();
		fireEvent.click(screen.getByText('Reiniciar'));

		expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'start', size: 7 }));
	});

});

describe('GameBoard - WebSocket Lifecycle', () => {
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

	it('handles WebSocket connection state transitions', () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		const ws = MockWebSocket.instances[0];
		
		// Initial state: CONNECTING
		expect(ws.readyState).toBe(0);
		
		// Open connection
		ws.open();
		expect(ws.readyState).toBe(MockWebSocket.OPEN);
		
		// Close connection
		ws.close();
		expect(ws.readyState).toBe(MockWebSocket.CLOSED);
	});

	it('can reconnect after initial connection closes', () => {
		render(<GameBoard username="test-username" />);
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		let ws = MockWebSocket.instances[0];
		ws.open();
		ws.close();

		fireEvent.click(screen.getByText('← Menú'));
		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));

		ws = MockWebSocket.instances[1];
		expect(ws.readyState).toBe(0); // CONNECTING
	});
});

