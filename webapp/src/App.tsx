import './App.css'
import { useState } from 'react'
import RegisterForm from './RegisterForm'
import LoginForm from './LoginForm'
import reactLogo from './assets/react.svg'
import GameBoard from './GameBoard'

function App() {
  const [showRegister, setShowRegister] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    setShowLogin(false)
    setShowRegister(false)
  }

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

      {!isAuthenticated && (
        <div className="auth-buttons">
          <button
            onClick={() => {
              setShowLogin(true)
              setShowRegister(false)
            }}
            className="submit-button"
          >
            Login
          </button>
          <button
            onClick={() => {
              setShowRegister(true)
              setShowLogin(false)
            }}
            className="submit-button"
          >
            Register
          </button>
        </div>
      )}

      {!isAuthenticated && showLogin && (
        <div className="form-container">
          <h3>Login</h3>
          <LoginForm onSuccess={handleAuthSuccess} />
        </div>
      )}

      {!isAuthenticated && showRegister && (
        <div className="form-container">
          <h3>Register</h3>
          <RegisterForm onSuccess={handleAuthSuccess} />
        </div>
      )}

      {isAuthenticated && (
        <div className="form-container">
          <GameBoard />
        </div>
      )}
    </div>
  )
}

export default App