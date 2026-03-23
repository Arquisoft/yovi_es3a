import { describe, expect, it } from 'vitest' 
import RegisterForm from '../RegisterForm'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react';


describe('RegisterForm', () =>
{
    it('renders without errors', () =>
    {
        <RegisterForm />

        // Mira si los labels están en el documento y tienen el texto correcto
        let label = document.querySelector('label[for="username"]');
        expect(label).toBeInTheDocument()
        expect(label).toHaveTextContent('Whats your name?')

        label = document.querySelector('label[for="password"]');
        expect(label).toBeInTheDocument()
        expect(label).toHaveTextContent('Whats your password?')
    })

    it ('register new user', () => {
        <RegisterForm />

        // Rellena los campos username y password
        const usernameInput = screen.getByLabelText('Whats your name?');
        expect(usernameInput).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('Whats your password?');
        expect(passwordInput).toBeInTheDocument();

        fireEvent.change(passwordInput, { target: { value: 'test-username' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    })
})