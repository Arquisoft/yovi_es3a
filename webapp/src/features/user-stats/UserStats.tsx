import React, { useEffect, useState } from 'react';
import './UserStats.css';

interface StatsProps {
  username: string;
}

interface UserStats {
  nombreUsuario: string;
  fechaUltimaEdicion: string;
  tiempoJuego: number;
  estadisticas: {
    partidasJugadas: number;
    victorias: number;
    derrotas: number;
    empates: number;
    puntosRanking: number;
  };
}

const PieChart: React.FC<{ wins: number; losses: number; draws: number }> = ({ wins, losses, draws }) => {
  const total = wins + losses + draws;
  if (total === 0) {
    return (
      <div className="pie-chart-container">
        <p className="text-muted">Sin partidas jugadas</p>
      </div>
    );
  }

  const winsPercentage = (wins / total) * 100;
  const lossesPercentage = (losses / total) * 100;
  const drawsPercentage = (draws / total) * 100;

  const circumference = 251; // 2 * π * 40 (radio del círculo)
  const winsDasharray = winsPercentage * circumference / 100;
  const lossesDasharray = lossesPercentage * circumference / 100;
  const drawsDasharray = drawsPercentage * circumference / 100;

  const winsOffset = 0;
  const lossesOffset = -(winsDasharray);
  const drawsOffset = -(winsDasharray + lossesDasharray);

  return (
    <div className="pie-chart-container">
      <svg viewBox="0 0 100 100" className="pie-chart">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e0e0e0" strokeWidth="20" />
        {/* Victorias - Verde */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#22c55e"
          strokeWidth="20"
          strokeDasharray={`${winsDasharray} ${circumference}`}
          strokeDashoffset={winsOffset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
        {/* Derrotas - Rojo */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#ef4444"
          strokeWidth="20"
          strokeDasharray={`${lossesDasharray} ${circumference}`}
          strokeDashoffset={lossesOffset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
        {/* Empates - Gris */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="20"
          strokeDasharray={`${drawsDasharray} ${circumference}`}
          strokeDashoffset={drawsOffset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
        <text x="50" y="50" textAnchor="middle" dy="0.3em" className="pie-chart-text">
          {winsPercentage.toFixed(0)}%
        </text>
      </svg>
      <div className="pie-legend mt-3">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
          <span>Victorias: {wins}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
          <span>Derrotas: {losses}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#9ca3af' }}></span>
          <span>Empates: {draws}</span>
        </div>
      </div>
    </div>
  );
};

const UserStatsComponent: React.FC<StatsProps> = ({ username }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      try {
        const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

        const response = await fetch(API_URL + '/stats/' + username);

        const data = await response.json();

        if (data.success) {
          const userData: UserStats = {
            nombreUsuario: data.nombreUsuario || username,
            fechaUltimaEdicion: data.fechaUltimaEdicion || new Date().toISOString(),
            tiempoJuego: data.tiempoJuego || 0,
            estadisticas: data.estadisticas || {
              partidasJugadas: 0,
              victorias: 0,
              derrotas: 0,
              empates: 0,
              puntosRanking: 0,
            },
          };
          setStats(userData);
        } else {
          setError(data.message || 'No se pudieron cargar las estadísticas.');
        }
      } catch {
        setError('Error de red al conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchStats();
    }
  }, [username]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  return (
    <div className="stats-overlay">

        <h2 className="stats-title dark-purple-fg fw-bold">
          Estadísticas del Jugador
        </h2>

        {loading && (
          <div className="text-center">
            <div className="spinner-border text-primary" aria-label="Cargando">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-2">Cargando estadísticas...</p>
          </div>
        )}

        {error && (
          <div
            className="alert alert-danger alert-dismissible fade show d-flex align-items-center border-0 bg-danger bg-opacity-10 text-danger"
            role="alert"
          >
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        {stats && (
          <div className="stats-content">
            {/* Columna Izquierda */}
            <div className="stats-column-left">
              {/* Usuario */}
              <div className="stats-section">
                <h5 className="stats-section-title">Nombre de Usuario</h5>
                <p className="stats-value">{stats.nombreUsuario}</p>
              </div>

              {/* Fecha de Creación */}
              <div className="stats-section">
                <h5 className="stats-section-title">Fecha de Creación</h5>
                <p className="stats-value">{formatDate(stats.fechaUltimaEdicion)}</p>
              </div>

              {/* Puntos de Ranking */}
              <div className="stats-section stats-highlight">
                <h5 className="stats-section-title">Puntos de Ranking</h5>
                <p className="stats-value stats-points">{stats.estadisticas.puntosRanking}</p>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="stats-column-right">
              {/* Gráfico de Resultados */}
              <div className="stats-section" style={{ width: '100%', margin: 0, padding: 0, border: 'none' }}>
                <h5 className="stats-section-title">Resultados</h5>
                <PieChart wins={stats.estadisticas.victorias} losses={stats.estadisticas.derrotas} draws={stats.estadisticas.empates} />
              </div>
            </div>
          </div>
        )}
        
    </div>
  );
};

export default UserStatsComponent;