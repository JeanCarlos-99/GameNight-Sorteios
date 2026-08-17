import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { dbManager } from '../../services/database';
import type { Participant, Prize, RaffleSettings } from '../../services/database';
import { 
  PlusCircle, Users, CheckSquare, Square, Search, 
  Settings2, ShieldAlert, Award
} from 'lucide-react';

interface RafflesProps {
  isAdmin: boolean;
  setView: (view: string) => void;
  onLaunchRaffle: (
    raffleData: { name: string; description: string; prizeId: string; settings: RaffleSettings },
    eligibleParticipants: Participant[]
  ) => void;
}

export const Raffles: React.FC<RafflesProps> = ({ isAdmin, setView, onLaunchRaffle }) => {
  const { activeEvent } = useEvent();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [previousWinners, setPreviousWinners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Campos do Formulário
  const [raffleName, setRaffleName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPrizeId, setSelectedPrizeId] = useState('');
  const [selectionMode, setSelectionMode] = useState<'all' | 'manual'>('all');
  const [manualSelection, setManualSelection] = useState<Record<string, boolean>>({});

  // Filtros internos da lista manual
  const [partSearch, setPartSearch] = useState('');

  // Regras padrão
  const [settings, setSettings] = useState<RaffleSettings>({
    removeWinnerFromPool: true,
    preventDrawnAgain: true,
    keepWinnerEligibleForFutureRaffles: false,
    showRegistrationNumber: true
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const db = dbManager.db;
      const [prizeList, partList, raffleList] = await Promise.all([
        db.listPrizes(activeEvent.id),
        db.listParticipants(activeEvent.id),
        db.listRaffles(activeEvent.id)
      ]);

      // Filtrar apenas prêmios disponíveis
      const availablePrizes = prizeList.filter(p => p.status === 'available' && p.quantity > 0);
      setPrizes(availablePrizes);
      
      // Armazenar participantes ativos
      const activeParticipants = partList.filter(p => p.status === 'active');
      setParticipants(activeParticipants);

      // Mapear ganhadores anteriores
      const winners = raffleList
        .map(r => r.winner?.participant.id)
        .filter(Boolean) as string[];
      setPreviousWinners(winners);

      // Auto-preencher nome do sorteio
      const count = raffleList.length + 1;
      setRaffleName(`Sorteio GameNight #${count.toString().padStart(2, '0')}`);

      if (availablePrizes.length > 0) {
        setSelectedPrizeId(availablePrizes[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do formulário de sorteio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeEvent]);

  // Atualizar seleção manual padrão quando participantes mudarem
  useEffect(() => {
    const defaultSelect: Record<string, boolean> = {};
    participants.forEach(p => {
      // Por padrão, se já ganhou e as regras barram, não seleciona
      const isWinner = previousWinners.includes(p.id);
      defaultSelect[p.id] = !isWinner;
    });
    setManualSelection(defaultSelect);
  }, [participants, previousWinners]);

  if (!activeEvent) {
    return (
      <div className="card text-center" style={{ padding: '3rem', marginTop: '2rem' }}>
        <h2>Nenhum Evento Selecionado</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Selecione ou crie um evento no menu lateral para iniciar um sorteio.
        </p>
      </div>
    );
  }

  // Filtrar quem é realmente elegível baseado nas regras marcadas
  const getEligiblePool = (): Participant[] => {
    return participants.filter(p => {
      // 1. Verificar se ganhou anteriormente
      const isPreviousWinner = previousWinners.includes(p.id);
      
      // Se já ganhou e está marcada a regra para não deixar ser sorteado novamente no evento
      if (isPreviousWinner && settings.preventDrawnAgain && !settings.keepWinnerEligibleForFutureRaffles) {
        return false;
      }

      // 2. Se for modo manual, verificar se foi checado
      if (selectionMode === 'manual') {
        return !!manualSelection[p.id];
      }

      return true;
    });
  };

  const handleSelectAll = () => {
    const updated = { ...manualSelection };
    filteredManualParticipants.forEach(p => {
      updated[p.id] = true;
    });
    setManualSelection(updated);
  };

  const handleDeselectAll = () => {
    const updated = { ...manualSelection };
    filteredManualParticipants.forEach(p => {
      updated[p.id] = false;
    });
    setManualSelection(updated);
  };

  const handleToggleSelect = (id: string) => {
    setManualSelection(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedPrizeId) {
      setErrorMsg('Por favor, selecione um prêmio para o sorteio.');
      return;
    }

    const pool = getEligiblePool();

    if (pool.length === 0) {
      setErrorMsg('Nenhum participante qualificado na lista. Selecione mais participantes ou adicione novos no menu.');
      return;
    }

    // Passar para a tela de Apresentação
    onLaunchRaffle({
      name: raffleName.trim(),
      description: description.trim(),
      prizeId: selectedPrizeId,
      settings
    }, pool);
  };

  const filteredManualParticipants = participants.filter(p => {
    return p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
           p.registration_number.includes(partSearch);
  });

  return (
    <div className="raffle-setup-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1>
          <Award size={28} className="neon-icon-purple" style={{ marginRight: '0.5rem' }} />
          Iniciar Novo Sorteio
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Configure o prêmio, a lista de competidores e as regras de exclusão antes de projetar.
        </p>
      </div>

      {loading ? (
        <div className="loading-spinner">Preparando sorteador...</div>
      ) : prizes.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          <ShieldAlert size={40} className="neon-icon-pink" style={{ marginBottom: '1rem' }} />
          <h3>Nenhum prêmio disponível</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '450px', margin: '0.5rem auto' }}>
            Todos os prêmios já foram sorteados ou nenhum foi cadastrado. Por favor, adicione novos prêmios ou atualize os estoques antes de sortear.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setView('prizes')}>
            Ir para Inventário de Prêmios
          </button>
        </div>
      ) : !isAdmin ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          <ShieldAlert size={40} className="neon-icon-pink" style={{ marginBottom: '1rem' }} />
          <h3>Acesso Administrativo Obrigatório</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Você precisa estar logado para criar e executar sorteios na tela de apresentação.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setView('login')}>
            Fazer Login Admin
          </button>
        </div>
      ) : (
        <form onSubmit={handleLaunch} className="grid-cols-2" style={{ alignItems: 'start' }}>
          {/* Informações e Configurações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ color: 'var(--accent-purple)', marginBottom: '1.25rem' }}>1. Informações Básicas</h3>
              
              <div className="form-group">
                <label className="form-label">Nome do Sorteio</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Sorteio GameNight #01"
                  value={raffleName}
                  onChange={e => setRaffleName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prêmio</label>
                <select
                  className="form-control"
                  value={selectedPrizeId}
                  onChange={e => setSelectedPrizeId(e.target.value)}
                  required
                >
                  {prizes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Disponível: {p.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição (Opcional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Observações adicionais exibidas no histórico..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Regras do Sorteio */}
            <div className="card">
              <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings2 size={18} />
                2. Regras de Sorteio
              </h3>
              
              <div className="settings-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.removeWinnerFromPool}
                    onChange={e => setSettings({ ...settings, removeWinnerFromPool: e.target.checked })}
                  />
                  <div>
                    <strong>Remover ganhador após sorteado</strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O ganhador será removido do pool deste sorteio.</p>
                  </div>
                </label>

                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.preventDrawnAgain}
                    onChange={e => setSettings({ ...settings, preventDrawnAgain: e.target.checked })}
                  />
                  <div>
                    <strong>Impedir re-sorteio no evento</strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evita que um participante ganhe múltiplos prêmios no evento.</p>
                  </div>
                </label>

                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.keepWinnerEligibleForFutureRaffles}
                    onChange={e => setSettings({ ...settings, keepWinnerEligibleForFutureRaffles: e.target.checked })}
                  />
                  <div>
                    <strong>Permitir participar dos próximos sorteios</strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mantém o ganhador qualificado para as próximas rodadas do evento.</p>
                  </div>
                </label>

                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.showRegistrationNumber}
                    onChange={e => setSettings({ ...settings, showRegistrationNumber: e.target.checked })}
                  />
                  <div>
                    <strong>Mostrar número da inscrição no rolo</strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exibe o código da inscrição (ex: #047) na animação.</p>
                  </div>
                </label>
              </div>
            </div>

            {errorMsg && (
              <div className="alert-box error">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }}>
              <PlusCircle size={20} /> Ir para Tela de Apresentação
            </button>
          </div>

          {/* Seleção de Participantes */}
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: 'var(--accent-pink)', marginBottom: '1rem' }}>3. Selecionar Participantes</h3>

            <div className="selection-mode-selectors" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className={`btn btn-secondary flex-1 ${selectionMode === 'all' ? 'btn-primary' : ''}`}
                onClick={() => setSelectionMode('all')}
                style={{ flex: 1 }}
              >
                Todos Elegíveis ({participants.filter(p => !previousWinners.includes(p.id) || !settings.preventDrawnAgain || settings.keepWinnerEligibleForFutureRaffles).length})
              </button>
              <button
                type="button"
                className={`btn btn-secondary flex-1 ${selectionMode === 'manual' ? 'btn-primary' : ''}`}
                onClick={() => setSelectionMode('manual')}
                style={{ flex: 1 }}
              >
                Selecionar Manual
              </button>
            </div>

            {selectionMode === 'manual' && (
              <div className="manual-selection-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div className="search-wrapper" style={{ flex: 1, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                      placeholder="Pesquisar participante..."
                      value={partSearch}
                      onChange={e => setPartSearch(e.target.value)}
                    />
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleSelectAll}>
                    Marcar Todos
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleDeselectAll}>
                    Desmarcar
                  </button>
                </div>

                <div className="manual-list" style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem' }}>
                  {filteredManualParticipants.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum participante encontrado.</div>
                  ) : (
                    filteredManualParticipants.map(p => {
                      const isWinner = previousWinners.includes(p.id);
                      return (
                        <label 
                          key={p.id} 
                          className={`manual-list-row ${manualSelection[p.id] ? 'checked' : ''} ${isWinner ? 'winner-badge' : ''}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '4px', cursor: 'pointer', transition: 'var(--transition-fast)', borderBottom: '1px solid var(--border-color)' }}
                        >
                          <input
                            type="checkbox"
                            style={{ display: 'none' }}
                            checked={!!manualSelection[p.id]}
                            onChange={() => handleToggleSelect(p.id)}
                          />
                          {manualSelection[p.id] ? (
                            <CheckSquare size={18} className="neon-icon-cyan" />
                          ) : (
                            <Square size={18} style={{ color: 'var(--text-muted)' }} />
                          )}
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <span style={{ fontWeight: 600, color: 'white', display: 'block', fontSize: '0.875rem' }}>{p.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Inscrição #{p.registration_number} {isWinner && '• (Já foi sorteado)'}
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {selectionMode === 'all' && (
              <div className="all-info-card" style={{ padding: '2rem 1.5rem', backgroundColor: 'rgba(139, 92, 246, 0.03)', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Users size={32} className="neon-icon-purple" style={{ marginBottom: '1rem' }} />
                <h4 style={{ marginBottom: '0.5rem' }}>Seleção Automática Habilitada</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', maxWidth: '350px' }}>
                  Todos os participantes ativos e elegíveis serão incluídos no sorteio. Você pode aplicar filtros adicionais marcando ou desmarcando as caixas de regras à esquerda.
                </p>
                <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  Total de participantes qualificados: <strong style={{ color: 'var(--accent-cyan)' }}>{getEligiblePool().length}</strong>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      <style>{`
        .manual-list-row:hover {
          background-color: var(--bg-card);
        }
        .manual-list-row.checked {
          background-color: rgba(6, 182, 212, 0.05);
        }
        .manual-list-row.winner-badge {
          border-left: 3px solid var(--accent-pink);
        }
        .alert-box.error {
          background-color: rgba(244, 63, 94, 0.1);
          border: 1px solid var(--accent-red);
          color: #fda4af;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .flex-1 {
          flex: 1;
        }
        .neon-icon-pink {
          color: var(--accent-pink);
        }
      `}</style>
    </div>
  );
};
export default Raffles;
