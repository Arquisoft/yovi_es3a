import React, { useEffect, useState } from 'react';
import './Ranking.css';

interface PlayerScore
{
  playerName: string;
  score: number;
}

interface RankingData
{
  gold: PlayerScore | null;
  silver: PlayerScore | null;
  bronze: PlayerScore | null;
  rest: PlayerScore[];
}

const Ranking: React.FC = () => {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() =>
  {
    fetch('http://localhost:3000/api/ranking')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => console.error("Error fetching ranking:", err));
  }, []);

  if (loading) return <div className="text-center mt-5">Cargando ranking...</div>;
  if (!data) return <div className="text-center mt-5">No hay datos disponibles</div>;

  return (
    <div className="card-transparent p-4 text-center mx-auto shadow-lg ranking-container-fix">
        <h1 className="fw-bold mb-4 display-5 ranking-dark-text">Ranking Global</h1>
        
        <div className="d-flex justify-content-center align-items-end mb-5">
            {data.silver && (
                <div className="mx-3">
                    <i className="bi bi-trophy-fill text-secondary display-5"></i>
                    <div className="h5 mt-2 podium-player-name">{data.silver.playerName}</div>
                    <div className="small podium-score">Puntos: {data.silver.score}</div>
                </div>
            )}
            {data.gold && (
                <div className="mx-4">
                    <i className="bi bi-trophy-fill text-warning display-2"></i>
                    <div className="h3 mt-2 fw-bold podium-player-name">{data.gold.playerName}</div>
                    <div className="fw-bold podium-score">Puntos: {data.gold.score}</div>
                </div>
            )}
            {data.bronze && (
                <div className="mx-3">
                    <i className="bi bi-trophy-fill" style={{ color: '#cd7f32', fontSize: '2.5rem' }}></i>
                    <div className="h5 mt-2 podium-player-name">{data.bronze.playerName}</div>
                    <div className="small podium-score">Puntos: {data.bronze.score}</div>
                </div>
            )}
        </div>

        <div className="table-responsive">
            <table className="table table-ranking-custom mt-3">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jugador</th>
                        <th>Puntuación</th>
                    </tr>
                </thead>
                <tbody>
                    {data.rest.slice(0, 7).map((player, index) => (
                        <tr key={index}>
                            <td className="fw-bold">{index + 4}</td>
                            <td>{player.playerName}</td>
                            <td>{player.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
};

export default Ranking;