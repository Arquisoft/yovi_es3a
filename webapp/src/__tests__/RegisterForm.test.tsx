// @vitest-environment jsdom
import { describe, expect, it } from 'vitest' 
import RegisterForm from '../RegisterForm'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react';


describe('RegisterForm', () =>
{
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

    it ('register new user', () => {
        render(<RegisterForm />);

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        // comprueba que se mete en la vista del juego
        const label = screen.getByText('Juego Y');
        expect(label).toBeInTheDocument()
    });

    it ('try register existing user', () => {
        render(<RegisterForm />);

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        // Encontrar el botón de submit
        const submitButton = screen.getByRole('button', { name: 'Lets go!' });
        expect(submitButton).toBeInTheDocument();

        // Hacer clic en el botón
        fireEvent.click(submitButton);

        // comprueba que se mete en la vista del juego
        const label = screen.getByText('Juego Y');
        expect(label).toBeInTheDocument()
    });

    it ('try register without password', () => {
        render(<RegisterForm />);

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(usernameInput, { target: { value: 'test-username' } });

        // Encontrar el botón de submit
        const submitButton = screen.getByRole('button', { name: 'Lets go!' });
        expect(submitButton).toBeInTheDocument();

        // Hacer clic en el botón
        fireEvent.click(submitButton);

        // comprueba que se sale el mensaje de error
        const label = screen.getByText('password is required');
        expect(label).toBeInTheDocument();
    });

    it ('try register without username', () => {
        render(<RegisterForm />);

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        // Encontrar el botón de submit
        const submitButton = screen.getByRole('button', { name: 'Lets go!' });
        expect(submitButton).toBeInTheDocument();

        // Hacer clic en el botón
        fireEvent.click(submitButton);

        // comprueba que se sale el mensaje de error
        const label = screen.getByText('username is required');
        expect(label).toBeInTheDocument();
    });
})