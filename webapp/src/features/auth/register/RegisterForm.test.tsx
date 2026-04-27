// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import RegisterForm from './RegisterForm'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, fireEvent, waitFor, cleanup } from '../../../test-utils.tsx'

describe('RegisterForm', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        cleanup();
    });

    it('renders without errors', () => {
        render(<MemoryRouter><RegisterForm /></MemoryRouter>);

        let label = document.querySelector('label[for="username"]');
        expect(label).toBeInTheDocument();
        expect(label).toHaveTextContent('Nombre de usuario:');

        label = document.querySelector('label[for="password"]');
        expect(label).toBeInTheDocument();
        expect(label).toHaveTextContent('Contraseña:');
    })

    it('register new user', async () => {
        const onSuccess = vi.fn();
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'Usuario creado correctamente' }),
        } as Response);

        render(<MemoryRouter><RegisterForm onSuccess={onSuccess} /></MemoryRouter>);

        const usernameInput = screen.getByLabelText('Nombre de usuario:');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Contraseña:');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButtons = screen.getAllByRole('button', { name: 'Crear cuenta' });
        const submitButton = submitButtons[0];
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
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Contraseña:');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButtons = screen.getAllByRole('button', { name: 'Crear cuenta' });
        const submitButton = submitButtons[0];
        expect(submitButton).toBeInTheDocument();

        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('User already exists')).toBeInTheDocument();
        });
    });

    it('try register without password', () => {
        render(<MemoryRouter><RegisterForm /></MemoryRouter>);

        const usernameInput = screen.getByLabelText('Nombre de usuario:');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Contraseña:');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });

        const submitButtons = screen.getAllByRole('button', { name: 'Crear cuenta' });
        const submitButton = submitButtons[0];
        expect(submitButton).toBeInTheDocument();

        fireEvent.click(submitButton);

        const label = screen.getByText(/Introduzca una contraseña válida/);
        expect(label).toBeInTheDocument();
    });

    it('try register without username', () => {
        render(<MemoryRouter><RegisterForm /></MemoryRouter>);

        const usernameInput = screen.getByLabelText('Nombre de usuario:');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Contraseña:');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButtons = screen.getAllByRole('button', { name: 'Crear cuenta' });
        const submitButton = submitButtons[0];
        expect(submitButton).toBeInTheDocument();

        fireEvent.click(submitButton);

        const label = screen.getByText(/Introduzca un nombre de usuario válido/);
        expect(label).toBeInTheDocument();
    });
})
