import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar, Footer } from './components/layout';
import './App.css';
import RegisterForm from './features/auth/register/RegisterForm';
import LoginForm from './features/auth/login/LoginForm';
import GameBoard from './features/game/GameBoard';
import UserStats from './features/user-stats/UserStats';
import Ranking from './features/ranking/Ranking';

function App()
{
	const storedUser = sessionStorage.getItem('username');
	const [loggedInUser, setLoggedInUser] = useState<string | null>(storedUser);
	const [setView] = useState<'login' | 'register'>(storedUser ? 'login' : 'register');

	const handleAuthSuccess = (username: string) =>
	{
		setLoggedInUser(username);
		sessionStorage.setItem('username', username);
	};

	const handleLogout = () =>
	{
		setLoggedInUser(null);
		sessionStorage.removeItem('username');
	};

	return (
		<Router>

				<div className="spectrum-background">
		
				{/* Upper navigation bar */}
				<Navbar
					user = {loggedInUser}
					onLogout = {handleLogout}
					onSwitchView = {setView}
				/>

				<main id="mainContainer" className="container d-flex justify-content-center align-items-center flex-grow-1 py-4">
					<div className="card card-transparent w-100 shadow-lg" style={{ 
						maxWidth: location.pathname === '/game' ? '900px' : '500px', 
						transition: 'max-width 0.4s ease-in-out' 
					}}>
						<div className="card-body p-4">
								
							<Routes>
								<Route path="/login" element=
								{
									!loggedInUser
										? <LoginForm onSuccess={handleAuthSuccess} />
										: <Navigate to="/game" />
								}/>
								
								<Route path="/register" element=
								{
									!loggedInUser
										? <RegisterForm onSuccess={handleAuthSuccess} />
										: <Navigate to="/game" />
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
										? <UserStats username={loggedInUser} onClose={function (): void {
											throw new Error('Function not implemented.');
										} } />
										: <Navigate to="/stats" />
								}/>

								<Route path="/ranking" element=
								{
									loggedInUser
										? <Ranking/>
										: <Navigate to="/login" />
								}/>

								{/* Redirect to login or game if URL not found or root */}
								<Route path="/" element=
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

		</Router>
	);
}

export default App;