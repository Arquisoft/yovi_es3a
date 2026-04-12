// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import LoginForm from './LoginForm'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

describe('LoginForm', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		global.fetch = originalFetch;
        
		cleanup();
	});

	it('renders without errors', () => {
		render(<LoginForm />);

		let label = document.querySelector('label[for="login-username"]');
		expect(label).toBeInTheDocument();
		expect(label).toHaveTextContent('Username:');

		label = document.querySelector('label[for="login-password"]');
		expect(label).toBeInTheDocument();
		expect(label).toHaveTextContent('Password:');
	});

	it('login existing user', async () => {
		const onSuccess = vi.fn();
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ message: 'Welcome back, test-username!' }),
		} as Response);

		render(<LoginForm onSuccess={onSuccess} />);

		const usernameInput = screen.getByLabelText('Username:');
		expect(usernameInput).toBeInTheDocument();

		const passwordInput = screen.getByLabelText('Password:');
		expect(passwordInput).toBeInTheDocument();

		fireEvent.change(usernameInput, { target: { value: 'test-username' } });
		fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

		const submitButtons = screen.getAllByRole('button', { name: 'Login' });
		const submitButton = submitButtons[0];
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalledWith('test-username');
		});

		expect(screen.getByText('Welcome back, test-username!')).toBeInTheDocument();
	});

	it('try login without password', () => {
		render(<LoginForm />);

		const usernameInput = screen.getByLabelText('Username:');
		expect(usernameInput).toBeInTheDocument();

		const passwordInput = screen.getByLabelText('Password:');
		expect(passwordInput).toBeInTheDocument();

		fireEvent.change(usernameInput, { target: { value: 'test-username' } });

		const submitButtons = screen.getAllByRole('button', { name: 'Login' });
		const submitButton = submitButtons[0];
		expect(submitButton).toBeInTheDocument();

		fireEvent.click(submitButton);

		const label = screen.getByText('Please enter a password.');
		expect(label).toBeInTheDocument();
	});

	it('try login without username', () => {
		render(<LoginForm />);

		const usernameInput = screen.getByLabelText('Username:');
		expect(usernameInput).toBeInTheDocument();

		const passwordInput = screen.getByLabelText('Password:');
		expect(passwordInput).toBeInTheDocument();

		fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

		const submitButtons = screen.getAllByRole('button', { name: 'Login' });
		const submitButton = submitButtons[0];
		expect(submitButton).toBeInTheDocument();

		fireEvent.click(submitButton);

		const label = screen.getByText('Please enter a username.');
		expect(label).toBeInTheDocument();
	});

	it('try login non-existent user', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({ error: 'User not found' }),
		} as Response);

		render(<LoginForm />);

		const usernameInput = screen.getByLabelText('Username:');
		expect(usernameInput).toBeInTheDocument();

		const passwordInput = screen.getByLabelText('Password:');
		expect(passwordInput).toBeInTheDocument();

		fireEvent.change(usernameInput, { target: { value: 'test-username' } });
		fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

		const submitButtons = screen.getAllByRole('button', { name: 'Login' });
		const submitButton = submitButtons[0];
		expect(submitButton).toBeInTheDocument();

		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('User not found')).toBeInTheDocument();
		});
	});
});
