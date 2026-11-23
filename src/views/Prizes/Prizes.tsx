import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { dbManager } from '../../services/database';
import type { Prize } from '../../services/database';
import { 
  Gift, Plus, Edit2, Trash2, ShieldAlert, Check, 
  AlertCircle, Image as ImageIcon
} from 'lucide-react';

interface PrizesProps {
  isAdmin: boolean;
  setView: (view: string) => void;
}

export const Prizes: React.FC<PrizesProps> = ({ isAdmin, setView: _setView }) => {
  const { activeEvent } = useEvent();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);

  // Campos do formulário
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    image_url: string;
    quantity: number;
    status: 'available' | 'drawn';
  }>({
    name: '',
    description: '',
    image_url: '',
    quantity: 1,
    status: 'available'
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadPrizes = async () => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const db = dbManager.db;
      const list = await db.listPrizes(activeEvent.id);
      setPrizes(list);
    } catch (err) {
      console.error('Erro ao listar prêmios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrizes();
  }, [activeEvent]);

  if (!activeEvent) {
    return (
      <div className="card text-center" style={{ padding: '3rem', marginTop: '2rem' }}>
        <h2>Nenhum Evento Selecionado</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Por favor, selecione ou crie um evento no menu lateral para gerenciar os prêmios.
        </p>
      </div>
    );
  }

  const handleOpenAddModal = () => {
    setEditingPrize(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      quantity: 1,
      status: 'available'
    });
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (p: Prize) => {
    setEditingPrize(p);
    setFormData({
      name: p.name,
      description: p.description || '',
      image_url: p.image_url || '',
      quantity: p.quantity,
      status: p.status
    });
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    if (!formData.name.trim()) {
      setFormError('O nome do prêmio é obrigatório.');
      setFormLoading(false);
      return;
    }

    try {
      const db = dbManager.db;
      const formatted = {
        event_id: activeEvent.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        image_url: formData.image_url.trim() || undefined,
        quantity: formData.quantity,
        status: formData.status
      };

      if (editingPrize) {
        await db.updatePrize(editingPrize.id, formatted);
        showNotification('success', 'Prêmio atualizado com sucesso!');
      } else {
        await db.addPrize(formatted);
        showNotification('success', 'Prêmio cadastrado com sucesso!');
      }

      setShowAddEditModal(false);
      loadPrizes();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja remover este prêmio?')) return;
    try {
      const db = dbManager.db;
      await db.deletePrize(id);
      showNotification('success', 'Prêmio removido com sucesso!');
      loadPrizes();
    } catch (err) {
      showNotification('error', 'Erro ao excluir prêmio: ' + (err as Error).message);
    }
  };

  // Helper para gerar URL de imagem simulada se não houver
  const getPrizeImage = (p: Prize) => {
    if (p.image_url) return p.image_url;
    // Retornar um placeholder gamer elegante baseado no nome do prêmio
    const name = p.name.toLowerCase();
    if (name.includes('ps5') || name.includes('playstation') || name.includes('console')) {
      return 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=300&auto=format&fit=crop&q=60';
    } else if (name.includes('headset') || name.includes('fone') || name.includes('audio')) {
      return 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&auto=format&fit=crop&q=60';
    } else if (name.includes('mouse') || name.includes('gamer mouse')) {
      return 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300&auto=format&fit=crop&q=60';
    } else if (name.includes('teclado') || name.includes('keyboard')) {
      return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=60';
    } else if (name.includes('cadeira') || name.includes('chair')) {
      return 'https://images.unsplash.com/photo-1598550476439-6847785fce6e?w=300&auto=format&fit=crop&q=60';
    }
    // Caixa de Loot Geral
    return 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300&auto=format&fit=crop&q=60';
  };

  return (
    <div className="prizes-container">
      {/* Notificação Toast */}
      {notification && (
        <div className={`toast ${notification.type === 'success' ? 'badge-green' : 'badge-red'}`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Prêmios Cadastrados ({prizes.length})</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Gerencie o inventário de recompensas que serão sorteadas durante o evento.
          </p>
        </div>
        
        {isAdmin ? (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Novo Prêmio
          </button>
        ) : (
          <div className="restrict-badge-alert">
            <ShieldAlert size={14} /> Modo Visualização
          </div>
        )}
      </div>

      {/* Lista de Prêmios */}
      {loading ? (
        <div className="loading-spinner">Carregando inventário...</div>
      ) : prizes.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          <Gift size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>Inventário de Prêmios Vazio</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Cadastre os itens (PlayStation 5, Periféricos, etc.) para poder realizar os sorteios.
          </p>
          {isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleOpenAddModal}>
              Cadastrar Primeiro Prêmio
            </button>
          )}
        </div>
      ) : (
        <div className="grid-cols-3 prizes-grid">
          {prizes.map(p => {
            const isAvail = p.status === 'available' && p.quantity > 0;
            return (
              <div 
                key={p.id} 
                className={`card prize-card card-hover ${isAvail ? 'available' : 'drawn'}`}
              >
                <div className="prize-image-box">
                  <img src={getPrizeImage(p)} alt={p.name} className="prize-thumbnail" />
                  <span className={`badge prize-status-badge ${isAvail ? 'badge-green' : 'badge-red'}`}>
                    {isAvail ? 'Disponível' : 'Sorteado'}
                  </span>
                </div>

                <div className="prize-card-body">
                  <h3 className="prize-card-title">{p.name}</h3>
                  <p className="prize-card-desc">{p.description || 'Sem descrição cadastrada.'}</p>
                  
                  <div className="prize-card-meta">
                    <span className="qty-tag">Estoque: <strong>{p.quantity}</strong></span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="prize-card-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditModal(p)}>
                      <Edit2 size={12} /> Editar
                    </button>
                    <button className="btn btn-secondary btn-sm text-danger" onClick={() => handleDeletePrize(p.id)}>
                      <Trash2 size={12} /> Excluir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit */}
      {showAddEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingPrize ? 'Editar Prêmio' : 'Cadastrar Novo Prêmio'}</h3>
              <button className="close-btn" onClick={() => setShowAddEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSavePrize}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-box error" style={{ marginBottom: '1.25rem' }}>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nome do Prêmio</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: PlayStation 5 Slim"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Exifique detalhes do modelo, marca e especificações..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Quantidade Disponível</label>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="available">Disponível</option>
                      <option value="drawn">Esgotado / Sorteado</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">URL da Imagem (Opcional)</label>
                  <div style={{ position: 'relative' }}>
                    <ImageIcon size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="url"
                      className="form-control"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={formData.image_url}
                      onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEditModal(false)} disabled={formLoading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .prizes-grid {
          margin-top: 1rem;
        }
        .prize-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          padding: 0;
        }
        .prize-card.available {
          border-color: rgba(16, 185, 129, 0.2);
        }
        .prize-card.drawn {
          border-color: rgba(244, 63, 94, 0.2);
          opacity: 0.85;
        }
        .prize-image-box {
          position: relative;
          height: 160px;
          width: 100%;
          background-color: #1a1e30;
          overflow: hidden;
        }
        .prize-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-normal);
        }
        .prize-card:hover .prize-thumbnail {
          transform: scale(1.05);
        }
        .prize-status-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          z-index: 5;
        }
        .prize-card-body {
          padding: 1.25rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .prize-card-title {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          color: white;
        }
        .prize-card-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex-grow: 1;
        }
        .prize-card-meta {
          margin-top: 1rem;
          font-size: 0.85rem;
        }
        .qty-tag {
          color: var(--text-secondary);
        }
        .qty-tag strong {
          color: var(--accent-cyan);
        }
        .prize-card-actions {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 0.5rem;
          background-color: rgba(0,0,0,0.15);
        }
        .prize-card-actions button {
          flex: 1;
        }
        .btn-sm {
          padding: 0.4rem 0.75rem;
          font-size: 0.75rem;
        }
        .restrict-badge-alert {
          background-color: rgba(139, 92, 246, 0.1);
          color: var(--accent-purple);
          border: 1px solid rgba(139, 92, 246, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-gamer);
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .alert-box.error {
          background-color: rgba(244, 63, 94, 0.1);
          border: 1px solid var(--accent-red);
          color: #fda4af;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};
export default Prizes;
