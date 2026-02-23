import './App.css'
import RegisterForm from './RegisterForm';
import GameClient from './GameClient';
import reactLogo from './assets/react.svg'
import GameBoard from './GameBoard';

function App() {
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
      <RegisterForm />
      <GameBoard />
    </div>
  );
}

export default App;
