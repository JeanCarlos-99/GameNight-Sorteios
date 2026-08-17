import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { dbManager } from '../../services/database';
import type { Participant } from '../../services/database';
import { MOCK_REGISTRATIONS_POOL } from '../../services/mockData';
import { 
  Users, Search, Upload, Plus, Edit2, Trash2, 
  Filter, Check, AlertCircle, Download, ShieldAlert
} from 'lucide-react';

interface ParticipantsProps {
  isAdmin: boolean;
  setView: (view: string) => void;
}

export const Participants: React.FC<ParticipantsProps> = ({ isAdmin, setView }) => {
  const { activeEvent } = useEvent();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Busca e Filtro
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Estados dos Modais
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  
  // Campos do formulário
  const [formData, setFormData] = useState<{
    registration_number: string;
    name: string;
    phone: string;
    email: string;
    cpf: string;
    status: 'active' | 'inactive';
  }>({
    registration_number: '',
    name: '',
    phone: '',
    email: '',
    cpf: '',
    status: 'active'
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Alertas temporários
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadParticipants = async () => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const db = dbManager.db;
      const list = await db.listParticipants(activeEvent.id);
      setParticipants(list);
    } catch (err) {
      console.error('Erro ao listar participantes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, [activeEvent]);

  if (!activeEvent) {
    return (
      <div className="card text-center" style={{ padding: '3rem', marginTop: '2rem' }}>
        <h2>Nenhum Evento Selecionado</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Por favor, selecione ou crie um evento no menu lateral para gerenciar os participantes.
        </p>
      </div>
    );
  }

  // --- CRUD PARTICIPANTE ---
  const handleOpenAddModal = () => {
    setEditingParticipant(null);
    // Auto-gerar número da inscrição sugerido com base no tamanho da lista + 1
    const nextRegNumber = (participants.length + 1).toString().padStart(3, '0');
    setFormData({
      registration_number: nextRegNumber,
      name: '',
      phone: '',
      email: '',
      cpf: '',
      status: 'active'
    });
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setFormData({
      registration_number: p.registration_number,
      name: p.name,
      phone: p.phone,
      email: p.email || '',
      cpf: p.cpf || '',
      status: p.status
    });
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    if (!formData.name.trim() || !formData.registration_number.trim() || !formData.phone.trim()) {
      setFormError('Nome, inscrição e telefone são obrigatórios.');
      setFormLoading(false);
      return;
    }

    try {
      const db = dbManager.db;
      const formatted = {
        event_id: activeEvent.id,
        registration_number: formData.registration_number.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        cpf: formData.cpf.trim() || undefined,
        status: formData.status
      };

      if (editingParticipant) {
        await db.updateParticipant(editingParticipant.id, formatted);
        showNotification('success', 'Participante atualizado com sucesso!');
      } else {
        await db.addParticipant(formatted);
        showNotification('success', 'Participante cadastrado com sucesso!');
      }
      
      setShowAddEditModal(false);
      loadParticipants();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!window.confirm('Deseja realmente remover este participante?')) return;
    try {
      const db = dbManager.db;
      await db.deleteParticipant(id);
      showNotification('success', 'Participante removido!');
      loadParticipants();
    } catch (err) {
      showNotification('error', 'Erro ao excluir: ' + (err as Error).message);
    }
  };

  // --- IMPORTAÇÕES ---
  
  // Importação Simulado de 100 Registros do GameNight
  const handleSimulatedImport = async () => {
    if (!isAdmin) {
      setView('login');
      return;
    }
    
    try {
      setLoading(true);
      const db = dbManager.db;
      
      // Importar todos os 100 participantes pré-gerados
      const result = await db.importParticipants(activeEvent.id, MOCK_REGISTRATIONS_POOL);
      
      showNotification('success', `Sucesso! Importados ${result.added} novos inscritos.`);
      loadParticipants();
    } catch (err) {
      showNotification('error', 'Erro na importação: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Importação por upload de CSV
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        setLoading(true);
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
        
        const listToImport: any[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Dividir por vírgulas respeitando aspas (regex básica de CSV)
          const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
          
          const item: any = {};
          headers.forEach((header, idx) => {
            const val = values[idx] || '';
            if (header === 'nome' || header === 'name') item.name = val;
            else if (header === 'telefone' || header === 'phone') item.phone = val;
            else if (header === 'email') item.email = val;
            else if (header === 'cpf') item.cpf = val;
            else if (header === 'inscricao' || header === 'registration_number') item.registration_number = val;
          });

          // Validações mínimas de linha
          if (item.name && item.phone) {
            if (!item.registration_number) {
              item.registration_number = (participants.length + listToImport.length + 1).toString().padStart(3, '0');
            }
            item.status = 'active';
            listToImport.push(item);
          }
        }

        if (listToImport.length === 0) {
          throw new Error('Nenhum participante válido encontrado no CSV. Verifique se possui cabeçalhos como: nome, telefone, inscricao, email, cpf.');
        }

        const db = dbManager.db;
        const result = await db.importParticipants(activeEvent.id, listToImport);
        showNotification('success', `Importados ${result.added} participantes com sucesso!`);
        loadParticipants();
      } catch (err) {
        showNotification('error', 'Falha ao ler CSV: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    // Limpar input
    e.target.value = '';
  };

  // Baixar modelo de CSV
  const downloadCSVTemplate = () => {
    const headers = 'nome,telefone,email,cpf,inscricao\n';
    const row = 'João da Silva,(11) 98888-7777,joao@exemplo.com,111.222.333-44,047\n';
    const blob = new Blob([headers + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_participantes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar e pesquisar participantes localmente
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.registration_number.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && p.status === 'active') ||
      (statusFilter === 'inactive' && p.status === 'inactive');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="participants-container">
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
          <h1>Participantes ({participants.length})</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Gerencie os inscritos habilitados para sorteios neste evento.
          </p>
        </div>
        
        {isAdmin ? (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={downloadCSVTemplate} title="Modelo de CSV">
              <Download size={16} />
            </button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={16} /> Importar CSV
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCSVUpload} 
                style={{ display: 'none' }} 
              />
            </label>
            <button className="btn btn-cyan" onClick={handleSimulatedImport}>
              Importar das Inscrições (100)
            </button>
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} /> Novo Participante
            </button>
          </div>
        ) : (
          <div className="restrict-badge-alert">
            <ShieldAlert size={14} /> Modo Visualização
          </div>
        )}
      </div>

      {/* Busca e Filtros */}
      <div className="card filters-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="filters-layout" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          
          <div className="search-wrapper" style={{ flex: 1, position: 'relative' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Pesquisar por nome ou número de inscrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-wrapper" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
            <select
              className="form-control"
              style={{ width: '180px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="loading-spinner">Carregando lista de inscritos...</div>
      ) : filteredParticipants.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          <Users size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>Nenhum participante encontrado</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Cadastre um novo ou clique em <strong>"Importar das Inscrições (100)"</strong> no topo para iniciar.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Inscrição</th>
                <th>Nome Completo</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Status</th>
                {isAdmin && <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'var(--font-gamer)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    #{p.registration_number}
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.cpf || '—'}</td>
                  <td>{p.phone}</td>
                  <td>{p.email || '—'}</td>
                  <td>
                    <span className={`badge ${p.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {p.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="icon-btn-edit" onClick={() => handleOpenEditModal(p)} title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button className="icon-btn-delete" onClick={() => handleDeleteParticipant(p.id)} title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      {showAddEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingParticipant ? 'Editar Participante' : 'Cadastrar Participante'}</h3>
              <button className="close-btn" onClick={() => setShowAddEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveParticipant}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-box error" style={{ marginBottom: '1.25rem' }}>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Nº Inscrição</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.registration_number}
                      onChange={e => setFormData({ ...formData, registration_number: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">CPF (Opcional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nome do Jogador"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="(00) 90000-0000"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">E-mail (Opcional)</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="exemplo@gamenight.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="active">Ativo (Participando dos sorteios)</option>
                    <option value="inactive">Inativo (Bloqueado de participar)</option>
                  </select>
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
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
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
        
        /* Icon action buttons */
        .icon-btn-edit, .icon-btn-delete {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border-color);
          background-color: var(--bg-card);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .icon-btn-edit:hover {
          color: var(--accent-cyan);
          border-color: var(--accent-cyan);
          box-shadow: 0 0 6px var(--accent-cyan-glow);
        }
        .icon-btn-delete:hover {
          color: var(--accent-red);
          border-color: var(--accent-red);
          box-shadow: 0 0 6px var(--accent-red-glow);
        }
        .alert-box.error {
          background-color: rgba(244, 63, 94, 0.1);
          border: 1px solid var(--accent-red);
          color: #fda4af;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
        }
        
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }
          .page-header div {
            width: 100%;
          }
          .page-header div[style*="display: flex"] {
            flex-direction: column;
            width: 100%;
          }
          .filters-layout {
            flex-direction: column;
            align-items: stretch !important;
          }
          .filter-wrapper select {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
export default Participants;
