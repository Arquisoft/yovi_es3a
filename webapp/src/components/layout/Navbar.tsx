import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface NavbarProps
{
  user: string | null;
  onLogout: () => void;
  onSwitchView?: (view: "login" | "register") => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) =>
{
  const navigate = useNavigate();

  const handleLogout = () =>
  {
    onLogout();
    navigate("/login");
  };

  return (
    <nav id="myNav" className="navbar navbar-expand-lg navbar-dark purple-bg shadow">
      <div className="container-fluid">
        
        {/* Navbar brand - App icon/brand */}
        <NavLink className="navbar-brand d-flex align-items-center" to="/" style={{ fontFamily: "'Righteous'" }}>
          <i className="bi bi-triangle-half h1 me-2 mb-0"></i>
          <b className="h2 font-weight-bold font-italic mb-0">YOVI</b>
        </NavLink>

        {/* Toggler for smaller viewports */}
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navLinks">
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div id="navLinks" className="collapse navbar-collapse">
            
          {/* Base links - play, ranking, stats...*/}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {user && (
              <>
                {/* GOTO: Play game */}
                <li className="nav-item">
                  <NavLink className="nav-link" to="/game">
                    <i className="bi bi-play-circle me-1"></i> Jugar
                  </NavLink>
                </li>

                {/* GOTO: personal stats */}
                <li className="nav-item">
                  <NavLink className="nav-link" to="/stats">
                    <i className="bi bi-bar-chart-fill me-1"></i> Estadísticas
                  </NavLink>
                </li>

                {/* GOTO: rankings */}
                <li className="nav-item">
                  <NavLink className="nav-link" to="/ranking">
                    <i className="bi bi-trophy me-1"></i> Ranking
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          {/* Auth-related links */}
          <ul className="navbar-nav ms-auto">
            {!user ? (
              <>
                {/* GOTO: log in */}
                <li className="nav-item">
                  <NavLink className="nav-link" to="/login">
                    <i className="bi bi-box-arrow-in-right me-1"></i> Iniciar sesión
                  </NavLink>
                </li>

                {/* GOTO: sign in */}
                <li className="nav-item">
                  <NavLink className="nav-link" to="/register">
                    <i className="bi bi-person-plus me-1"></i> Registrarse
                  </NavLink>
                </li>
              </>
            ) : (
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle btn border-0" href="#" role="button" data-bs-toggle="dropdown">
                  <i className="bi bi-person-circle me-1"></i> {user}
                </a>

                <ul className="dropdown-menu dropdown-menu-end shadow">
                  <li>
                    <button className="dropdown-item text-danger d-flex align-items-center" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i> Cerrar sesión
                    </button>
                  </li>
                </ul>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};