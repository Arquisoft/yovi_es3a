
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import LoginForm from './LoginForm.tsx'
import i18n from '../../../locales/i18n'
import { render, screen, fireEvent, waitFor, cleanup } from '../../../testing/test-utils.tsx'

describe('LoginForm', () => {
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
		render(<MemoryRouter><LoginForm /></MemoryRouter>);

		let label = screen.getByLabelText('Nombre de usuario:');
        expect(label).toBeInTheDocument();

		label = screen.getByLabelText('Contraseña:');
        expect(label).toBeInTheDocument();
	});

	it('login existing user', async () => {
		const onSuccess = vi.fn();
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ message: 'Login correcto' }),
		} as Response);

		render(<MemoryRouter><LoginForm onSuccess={onSuccess} /></MemoryRouter>);

		const usernameInput = screen.getByLabelText('Nombre de usuario:');
        const passwordInput = screen.getByLabelText('Contraseña:');

		fireEvent.change(usernameInput, { target: { value: 'test-username' } });
		fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

		const submitButton = screen.getByRole('button', { name: /Entrar/i });
        fireEvent.click(submitButton);

		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalledWith('test-username');
		});

		expect(screen.getByText(/Login correcto/)).toBeInTheDocument();
	});

	it('try login without password', () => {
		render(<MemoryRouter><LoginForm /></MemoryRouter>);

		const usernameInput = screen.getByLabelText('Nombre de usuario:');
        fireEvent.change(usernameInput, { target: { value: 'test-username' } });

        const submitButton = screen.getByRole('button', { name: /Entrar/i });
        fireEvent.click(submitButton);

        expect(
            screen.getByText(/Introduzca una contraseña válida/)
        ).toBeInTheDocument();
	});

	it('try login without username', () => {
		render(<MemoryRouter><LoginForm /></MemoryRouter>);

		const passwordInput = screen.getByLabelText('Contraseña:');
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButton = screen.getByRole('button', { name: /Entrar/i });
        fireEvent.click(submitButton);

        expect(
            screen.getByText(/Introduzca un nombre de usuario válido/)
        ).toBeInTheDocument();
	});

	it('try login non-existent user', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({ error: 'User not found' }),
		} as Response);

		render(<MemoryRouter><LoginForm /></MemoryRouter>);

		const usernameInput = screen.getByLabelText('Nombre de usuario:');
        const passwordInput = screen.getByLabelText('Contraseña:');

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        const submitButton = screen.getByRole('button', { name: /Entrar/i });
        fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('User not found')).toBeInTheDocument();
		});
	});
});
