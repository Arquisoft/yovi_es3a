// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import RegisterForm from './RegisterForm'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

describe('RegisterForm', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        cleanup();
    });

    it('renders without errors', () =>
    {
        render(<RegisterForm />);

        // Mira si los labels están en el documento y tienen el texto correcto
        let label = document.querySelector('label[for="username"]');
        expect(label).toBeInTheDocument();
        expect(label).toHaveTextContent('Whats your name?');

        label = document.querySelector('label[for="password"]');
        expect(label).toBeInTheDocument();
        expect(label).toHaveTextContent('Whats your password?');
    })

    it('register new user', async () => {
        const onSuccess = vi.fn();
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'User created successfully' }),
        } as Response);

        render(<RegisterForm onSuccess={onSuccess} />);

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButtons = screen.getAllByRole('button', { name: 'Lets go!' });
        const submitButton = submitButtons[0];
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith('test-username');
        });

        expect(screen.getByText('User created successfully')).toBeInTheDocument();
    });

    it('try register existing user', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'User already exists' }),
        } as Response);

        render(<RegisterForm />);

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        // Encontrar el botón de submit
        const submitButtons = screen.getAllByRole('button', { name: 'Lets go!' });
        const submitButton = submitButtons[0];
        expect(submitButton).toBeInTheDocument();

        // Hacer clic en el botón
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('User already exists')).toBeInTheDocument();
        });
    });

    it('try register without password', () => {
        render(<RegisterForm />);

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });

        // Encontrar el botón de submit
        const submitButtons = screen.getAllByRole('button', { name: 'Lets go!' });
        const submitButton = submitButtons[0];
        expect(submitButton).toBeInTheDocument();

        // Hacer clic en el botón
        fireEvent.click(submitButton);

        // comprueba que se sale el mensaje de error
        const label = screen.getByText('Please enter a password.');
        expect(label).toBeInTheDocument();
    });

    it('try register without username', () => {
        render(<RegisterForm />);

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        // Encontrar el botón de submit
        const submitButtons = screen.getAllByRole('button', { name: 'Lets go!' });
        const submitButton = submitButtons[0];
        expect(submitButton).toBeInTheDocument();

        // Hacer clic en el botón
        fireEvent.click(submitButton);

        // comprueba que se sale el mensaje de error
        const label = screen.getByText('Please enter a username.');
        expect(label).toBeInTheDocument();
    });
    })