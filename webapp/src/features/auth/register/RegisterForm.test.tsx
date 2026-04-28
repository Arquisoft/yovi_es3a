
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import i18n from '../../../locales/i18n'
import RegisterForm from './RegisterForm'
import { render, screen, fireEvent, waitFor, cleanup } from '../../../testing/test-utils.tsx'

describe('RegisterForm', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
        i18n.changeLanguage('es');
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        cleanup();
    });

    it('renders without errors', () => {
        render(<MemoryRouter><RegisterForm /></MemoryRouter>);

        const usernameLabel = screen.getByLabelText('Nombre de usuario:');
        expect(usernameLabel).toBeInTheDocument();

        const passwordLabel = screen.getByLabelText('Contraseña:');
        expect(passwordLabel).toBeInTheDocument();
    })

    it('register new user', async () => {
        const onSuccess = vi.fn();
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'Usuario creado correctamente' }),
        } as Response);

        render(<MemoryRouter><RegisterForm onSuccess={onSuccess} /></MemoryRouter>);

        const usernameInput = screen.getByLabelText('Nombre de usuario:');
        const passwordInput = screen.getByLabelText('Contraseña:');

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButton = screen.getByRole('button', { name: /Crear cuenta/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith('test-username');
        });

        expect(screen.getByText(/Registro correcto/)).toBeInTheDocument();
    });

    it('try register existing user', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'User already exists' }),
        } as Response);

        render(<MemoryRouter><RegisterForm /></MemoryRouter>);

        const usernameInput = screen.getByLabelText('Nombre de usuario:');
        const passwordInput = screen.getByLabelText('Contraseña:');

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButton = screen.getByRole('button', { name: /Crear cuenta/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('User already exists')).toBeInTheDocument();
        });
    });

    it('try register without password', () => {
        render(<MemoryRouter><RegisterForm /></MemoryRouter>);

        const usernameInput = screen.getByLabelText('Nombre de usuario:');
        fireEvent.change(usernameInput, { target: { value: 'test-username' } });

        const submitButton = screen.getByRole('button', { name: /Crear cuenta/i });
        fireEvent.click(submitButton);

        expect(
            screen.getByText(/Introduzca una contraseña válida/)
        ).toBeInTheDocument();
    });

    it('try register without username', () => {
        render(<MemoryRouter><RegisterForm /></MemoryRouter>);

        const passwordInput = screen.getByLabelText('Contraseña:');
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButton = screen.getByRole('button', { name: /Crear cuenta/i });
        fireEvent.click(submitButton);

        expect(
            screen.getByText(/Introduzca un nombre de usuario válido/)
        ).toBeInTheDocument();
    });
})
