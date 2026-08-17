import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { dbManager } from '../../services/database';
import type { Participant, RaffleWithDetails } from '../../services/database';
import { History as HistoryIcon, Calendar, Search, Users, ShieldCheck } from 'lucide-react';

export const History: React.FC = () => {
  const { activeEvent } = useEvent();
  const [raffles, setRaffles] = useState<RaffleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detalhes de Auditoria
  const [selectedRaffle, setSelectedRaffle] = useState<RaffleWithDetails | null>(null);
  const [auditedParticipants, setAuditedParticipants] = useState<Participant[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  const loadHistory = async () => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const db = dbManager.db;
      const list = await db.listRaffles(activeEvent.id);
      setRaffles(list);
    } catch (err) {
      console.error('Erro ao listar histórico de sorteios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeEvent]);

  const handleOpenAuditModal = async (raffle: RaffleWithDetails) => {
    setSelectedRaffle(raffle);
    setAuditSearch('');
    setAuditedParticipants([]);
    setLoadingAudit(true);

    try {
      const db = dbManager.db;
      const list = await db.getRaffleEligibleParticipants(raffle.id);
      setAuditedParticipants(list);
    } catch (err) {
      console.error('Erro ao puxar auditoria de participantes:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  if (!activeEvent) {
    return (
      <div className="card text-center" style={{ padding: '3rem', marginTop: '2rem' }}>
        <h2>Nenhum Evento Selecionado</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Selecione ou crie um evento no menu lateral para visualizar o histórico de sorteios.
        </p>
      </div>
    );
  }

  // Filtrar participantes da auditoria
  const filteredAudited = auditedParticipants.filter(p => {
    return p.name.toLowerCase().includes(auditSearch.toLowerCase()) ||
           p.registration_number.includes(auditSearch);
  });

  return (
    <div className="history-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1>
          <HistoryIcon size={28} className="neon-icon-purple" style={{ marginRight: '0.5rem' }} />
          Histórico de Sorteios
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Consulte o registro permanente de auditoria de todos os sorteios efetuados.
        </p>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="loading-spinner">Carregando auditorias...</div>
      ) : raffles.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          <HistoryIcon size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>Nenhum Sorteio Realizado</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Os registros dos sorteios aparecerão aqui automaticamente após a realização na tela de apresentação.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Sorteio</th>
                <th>Prêmio Sorteado</th>
                <th>Participantes</th>
                <th>Ganhador</th>
                <th>Data e Horário</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Auditoria</th>
              </tr>
            </thead>
            <tbody>
              {raffles.map(r => {
                const formattedDate = new Date(r.created_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      🎁 {r.prize?.name || 'Prêmio Indefinido'}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Users size={12} /> {r.participantsCount} inscritos
                      </span>
                    </td>
                    <td>
                      {r.winner ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'var(--accent-green)' }}>
                            {r.winner.participant.name}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Inscrição #{r.winner.participant.registration_number}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Sem Ganhador</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {formattedDate}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ border: '1px solid var(--accent-purple)' }}
                          onClick={() => handleOpenAuditModal(r)}
                        >
                          Inspecionar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Auditoria e Inspeção de Elegibilidade */}
      {selectedRaffle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} className="neon-icon-cyan" />
                Auditoria: {selectedRaffle.name}
              </h3>
              <button className="close-btn" onClick={() => setSelectedRaffle(null)}>&times;</button>
            </div>
            
            <div className="modal-body">
              {/* Informações Gerais */}
              <div className="audit-summary-grid">
                <div className="audit-summary-card">
                  <span className="audit-card-label">Prêmio Entregue</span>
                  <span className="audit-card-value">🏆 {selectedRaffle.prize?.name}</span>
                </div>
                
                <div className="audit-summary-card">
                  <span className="audit-card-label">Data do Desenlace</span>
                  <span className="audit-card-value">
                    <Calendar size={12} /> {new Date(selectedRaffle.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Detalhes Ganhador */}
              {selectedRaffle.winner && (
                <div className="card winner-audit-highlight" style={{ marginTop: '1.25rem', borderLeft: '4px solid var(--accent-green)' }}>
                  <h4 style={{ color: 'var(--accent-green)', fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-gamer)' }}>Ganhador Sorteado</h4>
                  <div className="winner-audit-details">
                    <div>
                      <span className="detail-label">Nome:</span>
                      <strong className="detail-val">{selectedRaffle.winner.participant.name}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Inscrição:</span>
                      <span className="detail-val">#{selectedRaffle.winner.participant.registration_number}</span>
                    </div>
                    <div>
                      <span className="detail-label">Telefone:</span>
                      <span className="detail-val">{selectedRaffle.winner.participant.phone}</span>
                    </div>
                    {selectedRaffle.winner.participant.email && (
                      <div>
                        <span className="detail-label">Email:</span>
                        <span className="detail-val">{selectedRaffle.winner.participant.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lista Completa de Participantes Qualificados */}
              <div className="audit-pool-section" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontFamily: 'var(--font-gamer)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    Pool de Participantes Habilitados ({auditedParticipants.length})
                  </h4>
                  <div className="search-wrapper" style={{ position: 'relative', width: '200px' }}>
                    <Search size={12} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '2rem', fontSize: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
                      placeholder="Pesquisar..."
                      value={auditSearch}
                      onChange={e => setAuditSearch(e.target.value)}
                    />
                  </div>
                </div>

                {loadingAudit ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Carregando pool de participantes...</div>
                ) : filteredAudited.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>Nenhum participante correspondente no pool.</div>
                ) : (
                  <div className="audit-pool-list">
                    {filteredAudited.map(p => {
                      const wasWinner = selectedRaffle.winner?.participant.id === p.id;
                      return (
                        <div 
                          key={p.id} 
                          className={`audit-pool-row ${wasWinner ? 'winner' : ''}`}
                        >
                          <span className="p-reg">#{p.registration_number}</span>
                          <span className="p-name">{p.name}</span>
                          {wasWinner && <span className="badge badge-green">Ganhador</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedRaffle(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .audit-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .audit-summary-card {
          padding: 0.75rem 1rem;
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
        }
        .audit-card-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-family: var(--font-gamer);
        }
        .audit-card-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          margin-top: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        
        .winner-audit-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem 1rem;
          font-size: 0.85rem;
        }
        .detail-label {
          color: var(--text-secondary);
          margin-right: 0.4rem;
        }
        .detail-val {
          color: white;
        }
        
        .audit-pool-list {
          max-height: 220px;
          overflow-y: auto;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background-color: var(--bg-secondary);
        }
        .audit-pool-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.85rem;
        }
        .audit-pool-row:last-child {
          border-bottom: none;
        }
        .audit-pool-row.winner {
          background-color: rgba(16, 185, 129, 0.05);
        }
        .audit-pool-row .p-reg {
          font-family: var(--font-gamer);
          font-weight: 600;
          color: var(--accent-cyan);
          width: 50px;
        }
        .audit-pool-row .p-name {
          flex: 1;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};
export default History;
