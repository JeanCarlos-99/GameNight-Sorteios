import React, { useEffect, useState } from 'react';
import { useEvent } from '../../context/EventContext';
import { dbManager } from '../../services/database';
import type { Participant, Prize, RaffleWithDetails } from '../../services/database';
import { 
  Users, Gift, Dices, Award, PlusCircle, ArrowRight,
  TrendingUp, Calendar, Trophy
} from 'lucide-react';

interface DashboardProps {
  setView: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const { activeEvent } = useEvent();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [raffles, setRaffles] = useState<RaffleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const db = dbManager.db;
      const [partList, prizeList, raffleList] = await Promise.all([
        db.listParticipants(activeEvent.id),
        db.listPrizes(activeEvent.id),
        db.listRaffles(activeEvent.id)
      ]);
      setParticipants(partList);
      setPrizes(prizeList);
      setRaffles(raffleList);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeEvent]);

  if (!activeEvent) {
    return (
      <div className="card text-center" style={{ padding: '3rem', marginTop: '2rem' }}>
        <h2>Nenhum Evento Selecionado</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Por favor, crie ou selecione um evento no menu lateral para visualizar o painel.
        </p>
      </div>
    );
  }

  // Cálculos do Dashboard
  const totalRegistered = participants.length;
  
  // Lista de IDs de quem já ganhou algum prêmio
  const winnerIds = raffles
    .map(r => r.winner?.participant.id)
    .filter(Boolean) as string[];

  // Participantes elegíveis: Status ativo e que ainda não ganharam (regra geral básica do dashboard)
  const totalEligible = participants.filter(p => 
    p.status === 'active' && 
    !winnerIds.includes(p.id)
  ).length;

  const totalPrizesAvailable = prizes.reduce((acc, curr) => {
    return curr.status === 'available' ? acc + curr.quantity : acc;
  }, 0);

  const totalRafflesDrawn = raffles.filter(r => r.winner).length;

  const recentWinners = raffles
    .filter(r => r.winner)
    .slice(0, 5); // Últimos 5

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="event-title-display">{activeEvent.name}</h1>
          <p className="dashboard-subtitle">
            <Calendar size={14} /> Central de Sorteios ativa e operando
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setView('raffles')}>
          <PlusCircle size={16} /> Novo Sorteio
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Carregando painel de estatísticas...</div>
      ) : (
        <>
          {/* Estatísticas Grid */}
          <div className="grid-cols-4 stat-cards-grid">
            <div className="card stat-card card-hover" onClick={() => setView('participants')}>
              <div className="stat-icon-wrapper purple">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Inscritos Totais</span>
                <h3>{totalRegistered}</h3>
              </div>
              <div className="stat-trend">
                <TrendingUp size={12} /> Gerenciar
              </div>
            </div>

            <div className="card stat-card card-hover" onClick={() => setView('participants')}>
              <div className="stat-icon-wrapper cyan">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Disponíveis Sorteios</span>
                <h3>{totalEligible}</h3>
              </div>
              <div className="stat-trend">
                <span>Elegíveis agora</span>
              </div>
            </div>

            <div className="card stat-card card-hover" onClick={() => setView('prizes')}>
              <div className="stat-icon-wrapper green">
                <Gift size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Prêmios Livres</span>
                <h3>{totalPrizesAvailable}</h3>
              </div>
              <div className="stat-trend">
                <span>Disponíveis</span>
              </div>
            </div>

            <div className="card stat-card card-hover" onClick={() => setView('history')}>
              <div className="stat-icon-wrapper pink">
                <Award size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Sorteios Efetuados</span>
                <h3>{totalRafflesDrawn}</h3>
              </div>
              <div className="stat-trend">
                <span>Auditados</span>
              </div>
            </div>
          </div>

          {/* Duas colunas principais */}
          <div className="dashboard-grid-layout" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
            
            {/* Coluna da Esquerda: Ações Rápidas & Resumo Prêmios */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Quick Actions Panel */}
              <div className="card">
                <h3 className="section-title">Painel de Controle</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Acesso rápido para organizar os sorteios do GameNight.
                </p>
                <div className="quick-actions-box">
                  <button className="action-btn card-hover" onClick={() => setView('participants')}>
                    <Users size={20} className="neon-icon-cyan" />
                    <div>
                      <h4>Participantes</h4>
                      <p>Importar CSV, gerenciar cadastros e inscrições.</p>
                    </div>
                    <ArrowRight size={16} className="arrow-icon" />
                  </button>
                  <button className="action-btn card-hover" onClick={() => setView('prizes')}>
                    <Gift size={20} className="neon-icon-pink" />
                    <div>
                      <h4>Prêmios do Evento</h4>
                      <p>Cadastrar consoles, periféricos gamer e chaves Steam.</p>
                    </div>
                    <ArrowRight size={16} className="arrow-icon" />
                  </button>
                  <button className="action-btn card-hover" onClick={() => setView('history')}>
                    <Dices size={20} className="neon-icon-purple" />
                    <div>
                      <h4>Histórico e Auditoria</h4>
                      <p>Visualizar logs de elegibilidade e participantes sorteados.</p>
                    </div>
                    <ArrowRight size={16} className="arrow-icon" />
                  </button>
                </div>
              </div>

              {/* Prizes Summary */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 className="section-title">Prêmios Cadastrados</h3>
                  <button className="text-btn" onClick={() => setView('prizes')}>Ver todos &rarr;</button>
                </div>
                {prizes.length === 0 ? (
                  <div className="text-center" style={{ padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                    Nenhum prêmio cadastrado neste evento.
                  </div>
                ) : (
                  <div className="dashboard-prizes-list">
                    {prizes.slice(0, 4).map(p => (
                      <div key={p.id} className="dash-prize-item">
                        <div className="prize-info">
                          <span className="prize-name-tag">{p.name}</span>
                          <span className="prize-qty-tag">Qtd: {p.quantity}</span>
                        </div>
                        <span className={`badge ${p.status === 'available' ? 'badge-green' : 'badge-red'}`}>
                          {p.status === 'available' ? 'Disponível' : 'Sorteado'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Coluna da Direita: Últimos Ganhadores */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} className="neon-icon-pink" />
                  Últimos Ganhadores
                </h3>
                <button className="text-btn" onClick={() => setView('history')}>Ver tudo &rarr;</button>
              </div>

              {recentWinners.length === 0 ? (
                <div className="no-winners-box text-center" style={{ padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <Dices size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>Nenhum sorteio realizado ainda neste evento.</p>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setView('raffles')}>
                    Iniciar Primeiro Sorteio
                  </button>
                </div>
              ) : (
                <div className="recent-winners-list">
                  {recentWinners.map(r => (
                    <div key={r.id} className="winner-dash-row">
                      <div className="winner-avatar">
                        {r.winner?.participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="winner-details">
                        <span className="winner-name-text">{r.winner?.participant.name}</span>
                        <span className="winner-meta">
                          Inscrição #{r.winner?.participant.registration_number} &bull; Sorteio: {r.name}
                        </span>
                        <span className="winner-prize-gift">
                          🎁 {r.prize.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .event-title-display {
          font-size: 1.8rem;
          background: linear-gradient(135deg, white, var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dashboard-subtitle {
          color: var(--text-secondary);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.25rem;
        }
        .loading-spinner {
          text-align: center;
          padding: 4rem;
          color: var(--text-secondary);
          font-family: var(--font-gamer);
        }
        
        /* Stat Cards */
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          cursor: pointer;
          position: relative;
        }
        .stat-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          color: white;
        }
        .stat-icon-wrapper.purple {
          background-color: var(--accent-purple);
          box-shadow: 0 0 10px var(--accent-purple-glow);
        }
        .stat-icon-wrapper.cyan {
          background-color: var(--accent-cyan);
          box-shadow: 0 0 10px var(--accent-cyan-glow);
        }
        .stat-icon-wrapper.green {
          background-color: var(--accent-green);
          box-shadow: 0 0 10px var(--accent-green-glow);
        }
        .stat-icon-wrapper.pink {
          background-color: var(--accent-pink);
          box-shadow: 0 0 10px var(--accent-pink-glow);
        }
        .stat-content {
          flex: 1;
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-family: var(--font-gamer);
        }
        .stat-card h3 {
          font-size: 1.75rem;
          margin-top: 0.25rem;
        }
        .stat-trend {
          position: absolute;
          right: 1rem;
          bottom: 0.75rem;
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-family: var(--font-gamer);
        }

        /* Quick Actions */
        .quick-actions-box {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-primary);
          text-align: left;
          transition: all var(--transition-fast);
        }
        .action-btn:hover {
          border-color: var(--accent-purple);
          background-color: var(--bg-card);
        }
        .action-btn h4 {
          font-size: 0.9rem;
          margin-bottom: 0.15rem;
        }
        .action-btn p {
          color: var(--text-secondary);
          font-size: 0.75rem;
        }
        .action-btn .arrow-icon {
          margin-left: auto;
          color: var(--text-muted);
          transition: transform var(--transition-fast);
        }
        .action-btn:hover .arrow-icon {
          transform: translateX(4px);
          color: var(--accent-cyan);
        }
        .neon-icon-purple {
          color: var(--accent-purple);
          filter: drop-shadow(0 0 4px var(--accent-purple-glow));
        }
        
        /* Prizes list */
        .dashboard-prizes-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .dash-prize-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
        }
        .prize-info {
          display: flex;
          flex-direction: column;
        }
        .prize-name-tag {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .prize-qty-tag {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        /* Winners list */
        .recent-winners-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .winner-dash-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .winner-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-pink));
          color: white;
          font-family: var(--font-gamer);
          font-weight: 700;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .winner-details {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .winner-name-text {
          font-weight: 600;
          font-size: 0.95rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .winner-meta {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.1rem;
        }
        .winner-prize-gift {
          font-size: 0.8rem;
          color: var(--accent-cyan);
          font-weight: 500;
          margin-top: 0.25rem;
        }
        .text-btn {
          background: transparent;
          border: none;
          color: var(--accent-cyan);
          cursor: pointer;
          font-family: var(--font-gamer);
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .text-btn:hover {
          color: var(--accent-purple);
          text-shadow: 0 0 6px var(--accent-purple-glow);
        }
        
        @media (max-width: 1024px) {
          .dashboard-grid-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
export default Dashboard;
