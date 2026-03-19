import './App.css'
import { useState } from 'react'
import RegisterForm from './features/auth/register/RegisterForm'
import LoginForm from './features/auth/login/LoginForm'
import reactLogo from './assets/react.svg'
import GameBoard from './features/game/GameBoard'

function App() {
  const storedUser = localStorage.getItem('username')

  const [showRegister, setShowRegister] = useState(false)
  const [showLogin, setShowLogin] = useState(!storedUser)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(storedUser))
  const [loggedInUser, setLoggedInUser] = useState<string | null>(storedUser)

  const handleAuthSuccess = (username: string) => {
    setLoggedInUser(username)
    setIsAuthenticated(true)
    setShowLogin(false)
    setShowRegister(false)
    localStorage.setItem('username', username)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setLoggedInUser(null)
    setShowLogin(true)
    setShowRegister(false)
    localStorage.removeItem('username')
  }

  return (
    <div className="App">
      {isAuthenticated && (
        <div className="user-header">
          <span className="user-name">{loggedInUser}</span>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
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
          {/* SIN PARÉNTESIS AQUÍ */}
          <LoginForm onSuccess={handleAuthSuccess} />
        </div>
      )}

      {!isAuthenticated && showRegister && (
        <div className="form-container">
          <h3>Register</h3>
          {/* SIN PARÉNTESIS AQUÍ */}
          <RegisterForm onSuccess={handleAuthSuccess} />
        </div>
      )}

      {isAuthenticated && (
        <div className="form-container">
          {/* Pasamos el usuario a GameBoard si lo configuraste para recibirlo */}
          <GameBoard username={loggedInUser || "Invitado"} />
        </div>
      )}
    </div>
  )
}

export default App