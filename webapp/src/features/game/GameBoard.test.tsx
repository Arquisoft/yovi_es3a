// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import GameBoard from './GameBoard'

class MockWebSocket {
	static instances: MockWebSocket[] = [];
	static OPEN = 1;
	static CLOSED = 3;

	url: string;
	readyState = 0;
	onopen: (() => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onclose: (() => void) | null = null;
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
	const originalWebSocket = global.WebSocket;
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
		MockWebSocket.instances = [];
		global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
		global.fetch = vi.fn();
	});

	afterEach(() => {
		global.WebSocket = originalWebSocket;
		global.fetch = originalFetch;
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
		expect(screen.getByText('28 celdas · N=7 · PvP')).toBeInTheDocument();
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
		expect(screen.getByText('28 celdas · N=7 · vs Bot')).toBeInTheDocument();
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

	it('shows winner even if match update fails', async () => {
		const fetchMock = vi.fn().mockRejectedValueOnce(new Error('network down'));
		global.fetch = fetchMock as unknown as typeof fetch;

		render(<GameBoard username="test-username" />);

		fireEvent.click(screen.getByRole('button', { name: /Jugador vs Jugador/i }));
		const ws = MockWebSocket.instances[0];
		ws.open();

		await waitFor(() => {
			expect(screen.getByText(/Online/i)).toBeInTheDocument();
		});

		await ws.emitMessage({
			type: 'state',
			yen: { layout: ['.'] },
			status: { Finished: { winner: { id: 0 } } },
			render: ''
		});

		await waitFor(() => {
			expect(screen.getByText('¡Jugador 1 gana!')).toBeInTheDocument();
		});
	});
});
