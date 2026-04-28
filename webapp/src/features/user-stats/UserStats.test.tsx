
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import i18n from '../../locales/i18n'
import UserStatsComponent from './UserStats.tsx'
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

    it('shows fallback date text and empty pie chart when stats have invalid date and no results', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                nombreUsuario: 'testUser',
                fechaUltimaEdicion: 'invalid-date',
                tiempoJuego: 0,
                estadisticas: {
                    partidasJugadas: 0,
                    victorias: 0,
                    derrotas: 0,
                    empates: 0,
                    puntosRanking: 0,
                },
            }),
        } as Response);

        render(<UserStatsComponent username="testUser" />);

        await waitFor(() => {
            expect(screen.getByText('Fecha no disponible')).toBeInTheDocument();
        });

        expect(screen.getByText('Sin partidas jugadas')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
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

    it('shows error when fetching games returns a non-ok HTTP response', async () => {
        const mockStats = { success: true, nombreUsuario: 'testUser', estadisticas: {} };

        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => mockStats } as Response)
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ success: false, message: 'Servidor no disponible' }),
            } as Response);

        render(<UserStatsComponent username="testUser" />);
        fireEvent.click(screen.getByRole('button', { name: /Historial de Partidas/i }));

        await waitFor(() => {
            expect(screen.getByText(/Error de red al conectar con el servidor/)).toBeInTheDocument();
        });
    });

    it('sorts games by date descending and keeps only the five most recent entries', async () => {
        const mockStats = { success: true, nombreUsuario: 'testUser', estadisticas: {} };
        const mockGames = {
            success: true,
            games: [
                { _id: '1', jugador: 'testUser', tipo: 'bot', fecha: '2024-01-02T10:00:00Z', activa: false, puntos: 8002 },
                { _id: '2', jugador: 'testUser', tipo: 'bot', fecha: '2024-01-06T10:00:00Z', activa: false, puntos: 9001 },
                { _id: '3', jugador: 'testUser', tipo: 'bot', fecha: '2024-01-01T10:00:00Z', activa: false, puntos: 4006 },
                { _id: '4', jugador: 'testUser', tipo: 'bot', fecha: '2024-01-05T10:00:00Z', activa: false, puntos: 7003 },
                { _id: '5', jugador: 'testUser', tipo: 'bot', fecha: '2024-01-03T10:00:00Z', activa: false, puntos: 6004 },
                { _id: '6', jugador: 'testUser', tipo: 'bot', fecha: '2024-01-04T10:00:00Z', activa: false, puntos: 5005 },
            ],
        };

        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => mockStats } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => mockGames } as Response);

        const { container } = render(<UserStatsComponent username="testUser" />);
        fireEvent.click(screen.getByRole('button', { name: /Historial de Partidas/i }));

        await waitFor(() => {
            expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
        });

        const rows = Array.from(container.querySelectorAll('tbody tr')).map((row) => row.textContent ?? '');
        expect(rows[0]).toContain('9001');
        expect(rows[1]).toContain('7003');
        expect(rows[2]).toContain('5005');
        expect(rows[3]).toContain('6004');
        expect(rows[4]).toContain('8002');
        expect(container.textContent).not.toContain('4006');
    });
});
