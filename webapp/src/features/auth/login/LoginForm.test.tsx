// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import LoginForm from './LoginForm'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

function ensureAlertPortal() {
	if (!document.getElementById('alert-portal')) {
		const portal = document.createElement('div')
		portal.id = 'alert-portal'
		document.body.appendChild(portal)
	}
}

describe('LoginForm', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
		ensureAlertPortal();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
        
		cleanup();
	});

	it('renders without errors', () => {
		render(<MemoryRouter><LoginForm /></MemoryRouter>);

		let label = document.querySelector('label[for="username"]');
		expect(label).toBeInTheDocument();
		expect(label).toHaveTextContent('Nombre de usuario:');

		label = document.querySelector('label[for="password"]');
		expect(label).toBeInTheDocument();
		expect(label).toHaveTextContent('Contraseña:');
	});

	it('login existing user', async () => {
		const onSuccess = vi.fn();
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ message: 'Welcome back, test-username!' }),
		} as Response);

		render(<MemoryRouter><LoginForm onSuccess={onSuccess} /></MemoryRouter>);

		const usernameInput = screen.getByLabelText('Nombre de usuario:');
		expect(usernameInput).toBeInTheDocument();

		const passwordInput = screen.getByLabelText('Contraseña:');
		expect(passwordInput).toBeInTheDocument();

		fireEvent.change(usernameInput, { target: { value: 'test-username' } });
		fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

		const submitButtons = screen.getAllByRole('button', { name: 'Entrar' });
		const submitButton = submitButtons[0];
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalledWith('test-username');
		});

		expect(screen.getByText('Welcome back, test-username!')).toBeInTheDocument();
	});

	it('try login without password', () => {
		render(<MemoryRouter><LoginForm /></MemoryRouter>);

		const usernameInput = screen.getByLabelText('Nombre de usuario:');
		expect(usernameInput).toBeInTheDocument();

		const passwordInput = screen.getByLabelText('Contraseña:');
		expect(passwordInput).toBeInTheDocument();

		fireEvent.change(usernameInput, { target: { value: 'test-username' } });

		const submitButtons = screen.getAllByRole('button', { name: 'Entrar' });
		const submitButton = submitButtons[0];
		expect(submitButton).toBeInTheDocument();

		fireEvent.click(submitButton);

		const label = screen.getByText('Please enter a password.');
		expect(label).toBeInTheDocument();
	});

	it('try login without username', () => {
		render(<MemoryRouter><LoginForm /></MemoryRouter>);

		const usernameInput = screen.getByLabelText('Nombre de usuario:');
		expect(usernameInput).toBeInTheDocument();

		const passwordInput = screen.getByLabelText('Contraseña:');
		expect(passwordInput).toBeInTheDocument();

		fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

		const submitButtons = screen.getAllByRole('button', { name: 'Entrar' });
		const submitButton = submitButtons[0];
		expect(submitButton).toBeInTheDocument();

		fireEvent.click(submitButton);

		const label = screen.getByText('Please enter a username.');
		expect(label).toBeInTheDocument();
	});

	it('try login non-existent user', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({ error: 'User not found' }),
		} as Response);

		render(<MemoryRouter><LoginForm /></MemoryRouter>);

		const usernameInput = screen.getByLabelText('Nombre de usuario:');
		expect(usernameInput).toBeInTheDocument();

		const passwordInput = screen.getByLabelText('Contraseña:');
		expect(passwordInput).toBeInTheDocument();

		fireEvent.change(usernameInput, { target: { value: 'test-username' } });
		fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

		const submitButtons = screen.getAllByRole('button', { name: 'Entrar' });
		const submitButton = submitButtons[0];
		expect(submitButton).toBeInTheDocument();

		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('User not found')).toBeInTheDocument();
		});
	});
});
