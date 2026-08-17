import React, { useState } from 'react';
import { useEvent } from '../context/EventContext';
import { dbManager } from '../services/database';
import { 
  LayoutDashboard, Users, Gift, PlusCircle, History, 
  Settings, LogOut, ChevronDown, Sparkles, Terminal
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  adminEmail: string | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, adminEmail, onLogout }) => {
  const { events, activeEvent, selectEvent, createEvent } = useEvent();
  const [showEventSelect, setShowEventSelect] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const isMock = dbManager.db.isMock;

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    try {
      await createEvent(newEventName.trim());
      setNewEventName('');
      setShowNewEventModal(false);
    } catch (err) {
      alert('Erro ao criar evento: ' + (err as Error).message);
    }
  };

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'participants', name: 'Participantes', icon: Users },
    { id: 'prizes', name: 'Prêmios', icon: Gift },
    { id: 'history', name: 'Histórico', icon: History },
  ];

  return (
    <aside className="sidebar-container">
      {/* Header Logo */}
      <div className="sidebar-logo">
        <Sparkles size={24} className="neon-icon-pink" />
        <div>
          <h2>GAMENIGHT</h2>
          <span className="logo-subtitle">Sorteador Gamer</span>
        </div>
      </div>

      {/* Database Mode Status */}
      <div className={`db-status-badge ${isMock ? 'mock' : 'supabase'}`}>
        <Terminal size={14} />
        <span>{isMock ? 'Modo Local (Demo)' : 'Supabase Conectado'}</span>
      </div>

      {/* Event Selection Selector */}
      <div className="sidebar-event-selector">
        <label className="form-label" style={{ fontSize: '0.65rem' }}>Evento Ativo</label>
        <button 
          className="event-select-button" 
          onClick={() => setShowEventSelect(!showEventSelect)}
        >
          <span className="event-name-truncate">{activeEvent ? activeEvent.name : 'Nenhum evento — clique para criar'}</span>
          <ChevronDown size={16} />
        </button>
        
        {showEventSelect && (
          <div className="event-select-dropdown">
            <div className="dropdown-title">Selecionar Evento</div>
            <div className="dropdown-list">
              {events.length === 0 && (
                <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Nenhum evento criado ainda.
                </div>
              )}
              {events.map(e => (
                <button
                  key={e.id}
                  className={`dropdown-item ${activeEvent?.id === e.id ? 'active' : ''}`}
                  onClick={() => {
                    selectEvent(e.id);
                    setShowEventSelect(false);
                  }}
                >
                  {e.name}
                </button>
              ))}
            </div>
            <button 
              className="dropdown-create-btn"
              onClick={() => {
                setShowNewEventModal(true);
                setShowEventSelect(false);
              }}
            >
              + Novo Evento
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-link ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </button>
          );
        })}

        <div className="nav-divider" />

        <button
          className={`nav-link create-raffle-nav-btn ${currentView === 'raffles' ? 'active' : ''}`}
          onClick={() => setView('raffles')}
        >
          <PlusCircle size={18} />
          <span>Criar Sorteio</span>
        </button>
      </nav>

      {/* Footer Info & Auth */}
      <div className="sidebar-footer">
        {adminEmail ? (
          <div className="admin-profile">
            <div className="profile-details">
              <span className="profile-role">Administrador</span>
              <span className="profile-email" title={adminEmail}>{adminEmail}</span>
            </div>
            <button 
              className="footer-icon-btn text-danger" 
              onClick={onLogout} 
              title="Sair da Administração"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary w-full" onClick={() => setView('login')}>
            Acesso Restrito
          </button>
        )}

        <button 
          className="nav-link settings-nav-link" 
          onClick={() => setView('config')}
          style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.8rem', justifyContent: 'center' }}
        >
          <Settings size={14} />
          <span>Configuração Supabase</span>
        </button>
      </div>

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Criar Novo Evento</h3>
              <button className="close-btn" onClick={() => setShowNewEventModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Evento</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: GameNight — Dezembro 2026"
                    value={newEventName}
                    onChange={e => setNewEventName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewEventModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
export default Sidebar;
