
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import Ranking from './Ranking'
import i18n from '../../locales/i18n'
import { render, screen, waitFor, cleanup } from '../../testing/test-utils.tsx'

describe('Ranking Component', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
        i18n.changeLanguage('es');
        globalThis.fetch = vi.fn();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        cleanup();
    });

    it('shows loading state initially', () => {
        globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
        render(<Ranking />);
        expect(screen.getByText('Cargando ranking...')).toBeInTheDocument();
    });

    it('shows error if fetch returns not ok', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        } as Response);

        render(<Ranking />);

        await waitFor(() => {
            expect(screen.getByText(/500: Internal Server Error/i)).toBeInTheDocument();
        });
    });

    it('shows error on network failure', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        render(<Ranking />);

        await waitFor(() => {
            expect(screen.getByText(/network error/i)).toBeInTheDocument();
        });
    });

    it('shows error "Formato de datos inválido" with invalid data format', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => null,
        } as Response);

        render(<Ranking />);

        await waitFor(() => {
            expect(screen.getByText('Error: Formato de datos inválido')).toBeInTheDocument();
        });
    });

    it('shows "No hay datos disponibles" when data is empty', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ gold: null, silver: null, bronze: null, rest: [] }),
        } as Response);

        render(<Ranking />);

        await waitFor(() => {
            expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument();
        });
    });

    it('renders the ranking list successfully', async () => {
        const mockData = {
            gold: { playerName: 'Alice', score: 1000 },
            silver: { playerName: 'Bob', score: 800 },
            bronze: { playerName: 'Charlie', score: 600 },
            rest: [
                { playerName: 'Dave', score: 400 },
                { playerName: 'Eve', score: 200 }
            ]
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockData,
        } as Response);

        render(<Ranking />);

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
            expect(screen.getByText('Charlie')).toBeInTheDocument();
            expect(screen.getByText('Dave')).toBeInTheDocument();
            expect(screen.getByText('Eve')).toBeInTheDocument();
        });
        
        expect(screen.getByText('Ranking Global')).toBeInTheDocument();
        expect(screen.getByText(/1000/)).toBeInTheDocument();
        expect(screen.getByText(/800/)).toBeInTheDocument();
    });
});
