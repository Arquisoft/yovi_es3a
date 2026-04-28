
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Ranking from './features/ranking/Ranking';
import GameBoard from './features/game/GameBoard';
import UserStats from './features/user-stats/UserStats';
import LoginForm from './features/auth/login/LoginForm';
import RegisterForm from './features/auth/register/RegisterForm';
import { Navbar, Footer } from './components/layout';

import './styles/App.css';

// Props separadas para evitar error de SonarQube
interface AppContentProps
{
	readonly loggedInUser: string | null;
	readonly handleAuthSuccess: (username: string) => void;
	readonly handleLogout: () => void;
}

// Componente que contiene la estructura de la app
function AppContent({loggedInUser, handleAuthSuccess, handleLogout} : AppContentProps)
{
	// Hook de React Router para obtener la ruta
	const location = useLocation();

	return (
		<div className="spectrum-background">
			{/* Barra de navegación superior */}
			<Navbar user = {loggedInUser} onLogout = {handleLogout} />

			<main id="mainContainer" className="container d-flex justify-content-center align-items-center flex-grow-1 py-4">
				
				<div className="card card-transparent w-100 shadow-lg" style={{ 
					maxWidth: location.pathname === '/game' ? '900px' : '500px', transition: 'max-width 0.4s ease-in-out' }}>
					
					<div className="card-body p-4">
						<Routes>
							<Route path="/login" element=
							{
								loggedInUser
									? <Navigate to="/game" />
									: <LoginForm onSuccess={handleAuthSuccess} />
							}/>
							
							<Route path="/register" element=
							{
								loggedInUser
									? <Navigate to="/game" />
									: <RegisterForm onSuccess={handleAuthSuccess} />
							}/>

							<Route path="/game" element=
							{
								loggedInUser
									? <GameBoard username={loggedInUser} />
									: <Navigate to="/login" />
							}/>
							
							<Route path="/stats" element=
							{
								loggedInUser
									? <UserStats username={loggedInUser} />
									: <Navigate to="/login" />
							}/>

							<Route path="/ranking" element=
							{
								loggedInUser
									? <Ranking/>
									: <Navigate to="/login" />
							}/>

							{/* Redirigir a login o game si la URL no es válida */}
							<Route path="/*" element=
							{
								<Navigate to={loggedInUser ? "/game" : "/login"} />
							}/>
						</Routes>
					</div>
				</div>
			</main>

			{/* Sticky footer */}
			<Footer/>
		</div>
	);
}

// Componente que gestiona la autenticación
function App()
{
	const storedUser = sessionStorage.getItem('username');
	const [loggedInUser, setLoggedInUser] = useState<string | null>(storedUser);

	const handleAuthSuccess = (username: string) => {
		setLoggedInUser(username);
		sessionStorage.setItem('username', username);
	};

	const handleLogout = () => {
		setLoggedInUser(null);
		sessionStorage.removeItem('username');
	};

	return (
		<Router>
			<AppContent
				loggedInUser={loggedInUser}
				handleAuthSuccess={handleAuthSuccess}
				handleLogout={handleLogout}
			/>
		</Router>
	);
}

export default App;
