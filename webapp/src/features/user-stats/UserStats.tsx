import React, { useEffect, useState } from 'react';
import './UserStats.css';
import { useTranslation } from 'react-i18next';

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

interface Game {
  _id: string;
  jugador: string;
  tipo: 'local' | 'bot';
  fecha: string;
  activa: boolean;
  puntos: number;
}

const PieChart: React.FC<{ wins: number; losses: number; draws: number }> = ({ wins, losses, draws }) => {
  const { t } = useTranslation();
  const total = wins + losses + draws;
  if (total === 0) {
    return (
      <div className="pie-chart-container">
        <p className="text-muted">Sin partidas jugadas.</p>
      </div>
    );
  }

  const winsPercentage = (wins / total) * 100;
  const lossesPercentage = (losses / total) * 100;
  const drawsPercentage = (draws / total) * 100;

  const circumference = 251;
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
        {wins > 0 && (
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#22c55e"
          strokeWidth="20"
          strokeDasharray={`${winsDasharray} ${circumference}`}
          strokeDashoffset={winsOffset}
          strokeLinecap="butt"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />

        )}
        {/* Derrotas - Rojo */}
        {losses > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#ef4444"
            strokeWidth="20"
            strokeDasharray={`${lossesDasharray} ${circumference}`}
            strokeDashoffset={lossesOffset}
            strokeLinecap="butt"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
        )}

        {/* Empates - Gris */}
        {draws > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="20"
            strokeDasharray={`${drawsDasharray} ${circumference}`}
            strokeDashoffset={drawsOffset}
            strokeLinecap="butt"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
        )}
        <text x="50" y="50" textAnchor="middle" dy="0.3em" className="pie-chart-text">
          {winsPercentage.toFixed(0)}%
        </text>
      </svg>
      <div className="pie-legend mt-3">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
          <span>{t('stats.wins')}: {wins}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
          <span>{t('stats.loses')}: {losses}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#9ca3af' }}></span>
          <span>{t('stats.draws')}: {draws}</span>
        </div>
      </div>
    </div>
  );
};

const UserStatsComponent: React.FC<StatsProps> = ({ username }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'games'>('stats');

  const { t } = useTranslation();

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

  useEffect(() => {
    const fetchGames = async () => {
      if (activeTab !== 'games') return;

      setGamesLoading(true);
      setGamesError(null);

      try {
        const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
        const response = await fetch(API_URL + '/games/user/' + username);
        const data = await response.json();

        if (data.success) {
          const sortedGames = data.games
            .sort((a: Game, b: Game) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            .slice(0, 5);
          setGames(sortedGames);
        } else {
          setGamesError(data.message || 'No se pudieron cargar las partidas.');
        }
      } catch {
        setGamesError('Error de red al conectar con el servidor.');
      } finally {
        setGamesLoading(false);
      }
    };

    fetchGames();
  }, [username, activeTab]);

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

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const getGameResult = (game: Game) => {
    return game.puntos > 0 ? t('stats.win') : t('stats.lose');
  };

  const getGameResultClass = (game: Game) => {
    return game.puntos > 0 ? 'result-win' : 'result-loss';
  };

  const getOpponentType = (tipo: string) => {
    return tipo === 'bot' ? t('stats.ai_bot') : t('stats.local_player');
  };

  return (
    <div className="stats-overlay">
      <h2 className="stats-title dark-purple-fg fw-bold">
        {t('stats.header')}
      </h2>

      {/* Tab Navigation */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 {t('stats.overall')}
        </button>
        <button
          className={`tab-button ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          🎮 {t('stats.history')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tabs-content">
        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="tab-pane active">
            {loading && (
              <div className="text-center">
                <div className="spinner-border text-primary" aria-label="Cargando">
                  <span className="visually-hidden">{t('stats.aria.loading')}...</span>
                </div>
                <p className="mt-2">{t('stats.overall.loading')}...</p>
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
                    <h5 className="stats-section-title"> {t('stats.username')} </h5>
                    <p className="stats-value">{stats.nombreUsuario}</p>
                  </div>

                  {/* Fecha de Creación */}
                  <div className="stats-section">
                    <h5 className="stats-section-title"> {t('stats.create_date')} </h5>
                    <p className="stats-value">{formatDate(stats.fechaUltimaEdicion)}</p>
                  </div>

                  {/* Puntos de Ranking */}
                  <div className="stats-section stats-highlight">
                    <h5 className="stats-section-title">  {t('stats.points')} </h5>
                    <p className="stats-value stats-points">{stats.estadisticas.puntosRanking}</p>
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="stats-column-right">
                  {/* Gráfico de Resultados */}
                  <div className="stats-section" style={{ width: '100%', margin: 0, padding: 0, border: 'none' }}>
                    <h5 className="stats-section-title"> {t('stats.results')} </h5>
                    <PieChart wins={stats.estadisticas.victorias} losses={stats.estadisticas.derrotas} draws={stats.estadisticas.empates} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Games History Tab */}
        {activeTab === 'games' && (
          <div className="tab-pane active">
            {gamesLoading && (
              <div className="text-center">
                <div className="spinner-border text-primary" aria-label="Cargando">
                  <span className="visually-hidden"> {t('aria.loading')} ...</span>
                </div>
                <p className="mt-2"> {t('stats.history.loading')} ...</p>
              </div>
            )}

            {gamesError && (
              <div
                className="alert alert-danger alert-dismissible fade show d-flex align-items-center border-0 bg-danger bg-opacity-10 text-danger"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <div>{gamesError}</div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setGamesError(null)}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {!gamesLoading && !gamesError && (
              <div className="games-table-container">
                {games.length === 0 ? (
                  <p className="text-center text-muted mt-4"> {t('stats.history.no_games')} </p>
                ) : (
                  <table className="games-table">
                    <thead>
                      <tr>
                        <th>{t('stats.history.rival')}</th>
                        <th>{t('stats.history.result')}</th>
                        <th>{t('stats.history.points')}</th>
                        <th>{t('stats.history.datetime')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {games.map((game) => (
                        <tr key={game._id} className={getGameResultClass(game)}>
                          <td className="opponent-cell">{getOpponentType(game.tipo)}</td>
                          <td className="result-cell">
                            <span className={`result-badge ${getGameResultClass(game)}`}>
                              {getGameResult(game)}
                            </span>
                          </td>
                          <td className="points-cell">{game.puntos}</td>
                          <td className="date-cell">{formatDateTime(game.fecha)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserStatsComponent;