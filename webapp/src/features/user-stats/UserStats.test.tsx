
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import i18n from '../../locales/i18n'
import UserStatsComponent from './UserStats'
import { render, screen, waitFor, cleanup, fireEvent } from '../../testing/test-utils.tsx'

describe('UserStatsComponent', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
        globalThis.fetch = vi.fn();
        i18n.changeLanguage('es');
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        cleanup();
    });

    // --- Tab de Estadísticas ---
    it('shows loading state initially for stats', () => {
        globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
        render(<UserStatsComponent username="testUser" />);
        expect(screen.getByText(/Cargando estadísticas/i)).toBeInTheDocument();  
    });

    it('shows error when fetching stats fails (network error)', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
        render(<UserStatsComponent username="testUser" />);
        
        await waitFor(() => {
            expect(screen.getByText('Error de red al conectar con el servidor.')).toBeInTheDocument();
        });
    });

    it('shows error when fetching stats returns success: false', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: false, message: 'Usuario no encontrado' }),
        } as Response);
        render(<UserStatsComponent username="testUser" />);
        
        await waitFor(() => {
            expect(screen.getByText('Usuario no encontrado')).toBeInTheDocument();
        });
    });

    it('renders user stats successfully', async () => {
        const mockStats = {
            success: true,
            nombreUsuario: 'testUser',
            fechaUltimaEdicion: '2024-10-15T12:00:00Z',
            tiempoJuego: 100,
            estadisticas: {
                partidasJugadas: 10,
                victorias: 5,
                derrotas: 3,
                empates: 2,
                puntosRanking: 1500,
            }
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockStats,
        } as Response);

        render(<UserStatsComponent username="testUser" />);

        await waitFor(() => {
            expect(screen.getByText('testUser')).toBeInTheDocument();
        });
        
        expect(screen.getByText('1500')).toBeInTheDocument(); // Puntos de ranking
        // Pie chart values
        expect(screen.getByText('Victorias: 5')).toBeInTheDocument();
        expect(screen.getByText('Derrotas: 3')).toBeInTheDocument();
        expect(screen.getByText('Empates: 2')).toBeInTheDocument();
    });

    // --- Tab de Historial de Partidas ---
    it('switches to games tab and shows loading state', async () => {
        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, nombreUsuario: 'testUser', estadisticas: {} }),
            } as Response) // Primera llamada: stats
            .mockImplementationOnce(() => new Promise(() => {})); // Segunda llamada al pulsar el tab: se queda colgando

        render(<UserStatsComponent username="testUser" />);
        
        const gamesTab = screen.getByRole('button', { name: /Historial de Partidas/i });
        fireEvent.click(gamesTab);

        await waitFor(() => {
            expect(screen.getByText(/Cargando historial de partidas/i)).toBeInTheDocument();
        });
    });

    it('shows games history successfully', async () => {
        const mockStats = { success: true, nombreUsuario: 'testUser', estadisticas: {} };
        const mockGames = {
            success: true,
            games: [
                { _id: '1', jugador: 'testUser', tipo: 'bot', fecha: '2023-10-15T12:00:00Z', activa: false, puntos: 10 },
                { _id: '2', jugador: 'testUser', tipo: 'local', fecha: '2023-10-14T12:00:00Z', activa: false, puntos: -5 }
            ]
        };

        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => mockStats } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => mockGames } as Response);

        render(<UserStatsComponent username="testUser" />);
        
        fireEvent.click(screen.getByRole('button', { name: /Historial de Partidas/i }));

        await waitFor(() => {
            expect(screen.getByText('Bot IA')).toBeInTheDocument();
            expect(screen.getByText('Jugador Local')).toBeInTheDocument();
        });
        
        expect(screen.getByText('Victoria')).toBeInTheDocument();
        expect(screen.getByText('Derrota')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('shows "No hay partidas disponibles" when games array is empty', async () => {
        const mockStats = { success: true, nombreUsuario: 'testUser', estadisticas: {} };
        const mockGames = { success: true, games: [] };

        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => mockStats } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => mockGames } as Response);

        render(<UserStatsComponent username="testUser" />);
        fireEvent.click(screen.getByRole('button', { name: /Historial de Partidas/i }));

        await waitFor(() => {
            expect(screen.getByText('No hay partidas disponibles')).toBeInTheDocument();
        });
    });

    it('shows error when fetching games fails', async () => {
        const mockStats = { success: true, nombreUsuario: 'testUser', estadisticas: {} };
        
        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => mockStats } as Response)
            .mockRejectedValueOnce(new Error('Network error')); // Error al cargar juegos

        render(<UserStatsComponent username="testUser" />);
        fireEvent.click(screen.getByRole('button', { name: /Historial de Partidas/i }));

        await waitFor(() => {
            expect(screen.getByText(/Error de red al conectar con el servidor/)).toBeInTheDocument();
        });
    });
});
