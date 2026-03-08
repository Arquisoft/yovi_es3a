import './App.css'
import { useState } from 'react';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import reactLogo from './assets/react.svg'

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => {
            setShowLogin(true);
            setShowRegister(false);
          }}
          className="submit-button"
          style={{ padding: '10px 20px' }}
        >
          Login
        </button>
        <button
          onClick={() => {
            setShowRegister(true);
            setShowLogin(false);
          }}
          className="submit-button"
          style={{ padding: '10px 20px' }}
        >
          Register
        </button>
      </div>

      {showLogin && (
        <div style={{ marginTop: '20px' }}>
          <h3>Login</h3>
          <LoginForm />
        </div>
      )}

      {showRegister && (
        <div style={{ marginTop: '20px' }}>
          <h3>Register</h3>
          <RegisterForm />
        </div>
      )}
    </div>
  );
}

export default App;
