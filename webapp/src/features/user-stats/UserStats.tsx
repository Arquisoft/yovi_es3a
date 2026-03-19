import React, { useEffect, useState } from 'react';
import './UserStats.css';

interface StatsProps {
  username: string;
  onClose: () => void;
}

const UserStats: React.FC<StatsProps> = ({ username, onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
        
        const response = await fetch(`${API_URL}/stats/${username}`); 
        const data = await response.json();
        
        if (data.success) {
          setStats(data.estadisticas);
        } else {
          setError(data.message || 'No se pudieron cargar las estadísticas.');
        }
      } catch (err) {
        setError('Error de red al conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchStats();
    }
  }, [username]);

  return (
    <div className="stats-overlay">
      <div className="stats-modal">
        <h1 className="stats-title">{username}</h1>
        
        {loading && <p>Cargando estadísticas...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        {stats && (
          <div className="stats-content">
            <div className="stats-total-container">
              <p className="stats-total">
                Partidas Totales: {stats.partidasTotales || 0}
              </p>
            </div>
            
            <div className="stats-details">
              <div className="stats-wins">
                Victorias: {stats.victorias || 0}
              </div>
              <div className="stats-losses">
                Derrotas: {stats.derrotas || 0}
              </div>
            </div>
            <br></br>
            <div className="stats-points">
              Puntos Totales: {stats.puntosRanking || 0}
            </div>
          </div>

        )}

        <button onClick={onClose} className="stats-close-btn">
          Volver al juego
        </button>
      </div>
    </div>
  );
};

export default UserStats;