import React, { useState, useEffect } from 'react';
import { dbManager } from '../../services/database';
import type { SupabaseConfig } from '../../services/database';
import { Settings, CheckCircle2, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react';

export const Config: React.FC = () => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedConfig, setSavedConfig] = useState<SupabaseConfig | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const config = dbManager.db.getSupabaseConfig();
    setSavedConfig(config);
    if (config) {
      setUrl(config.url);
      setAnonKey(config.anonKey);
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    const trimmedUrl = url.trim();
    const trimmedKey = anonKey.trim();

    if (!trimmedUrl || !trimmedKey) {
      setStatusMessage({
        type: 'error',
        text: 'Preencha a URL e a Chave Anon do Supabase.'
      });
      setLoading(false);
      return;
    }

    try {
      // Gravar configuração no dbManager
      dbManager.db.setSupabaseConfig({
        url: trimmedUrl,
        anonKey: trimmedKey
      });

      setSavedConfig({ url: trimmedUrl, anonKey: trimmedKey });
      setStatusMessage({
        type: 'success',
        text: 'Configurações de conexão salvas! O aplicativo agora está integrado com o banco de dados Supabase.'
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Erro ao conectar: ' + (err as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    dbManager.db.setSupabaseConfig(null);
    setUrl('');
    setAnonKey('');
    setSavedConfig(null);
    setStatusMessage({
      type: 'info',
      text: 'Configurações limpas! O aplicativo retornou para o Modo de Teste Local (LocalStorage).'
    });
  };

  const isMock = dbManager.db.isMock;

  return (
    <div className="config-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={28} className="neon-icon-cyan" />
          Configuração Supabase
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Conecte este aplicativo ao seu banco de dados PostgreSQL no Supabase.
        </p>
      </div>

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Formulário de Configuração */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--accent-cyan)' }}>Credenciais do Banco</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">URL do Projeto Supabase</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://xyz-seu-projeto.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Chave Anon Key (Pública)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="config-actions">
              <button 
                type="submit" 
                className="btn btn-cyan" 
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar e Conectar'}
              </button>
              {savedConfig && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleClear}
                  disabled={loading}
                >
                  Desconectar Supabase
                </button>
              )}
            </div>
          </form>

          {statusMessage && (
            <div className={`status-banner ${statusMessage.type}`} style={{ marginTop: '1.5rem' }}>
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : 
               statusMessage.type === 'error' ? <AlertTriangle size={16} /> : <RefreshCw size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Informações Auxiliares */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--accent-purple)' }}>Status da Conexão</h3>
          
          <div className="connection-status-panel">
            <div className={`status-indicator-box ${isMock ? 'inactive' : 'active'}`}>
              <div className="indicator-dot" />
              <div>
                <h4>{isMock ? 'Modo de Teste Local' : 'Banco Supabase Ativo'}</h4>
                <p>{isMock 
                  ? 'Os dados estão sendo salvos apenas no LocalStorage do seu navegador. Bom para testar!'
                  : 'Os dados estão salvos nas tabelas seguras no PostgreSQL do Supabase.'}
                </p>
              </div>
            </div>

            <div className="info-notes" style={{ marginTop: '1.5rem' }}>
              <h4>Como configurar o Supabase:</h4>
              <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Crie um projeto gratuito em <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</li>
                <li>Vá até as configurações de <strong>API</strong> do seu projeto e copie a <strong>Project URL</strong> e a <strong>anon key</strong>.</li>
                <li>Copie as tabelas executando o script SQL fornecido na raiz do projeto chamado <code>supabase_setup.sql</code> no menu <strong>SQL Editor</strong> do painel Supabase.</li>
                <li>Insira as chaves ao lado para ativar a persistência segura!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .config-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .eye-toggle-btn {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .eye-toggle-btn:hover {
          color: var(--text-primary);
        }
        .status-banner {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
        }
        .status-banner.success {
          background-color: rgba(16, 185, 129, 0.1);
          border: 1px solid var(--accent-green);
          color: #a7f3d0;
        }
        .status-banner.error {
          background-color: rgba(244, 63, 94, 0.1);
          border: 1px solid var(--accent-red);
          color: #fda4af;
        }
        .status-banner.info {
          background-color: rgba(6, 182, 212, 0.1);
          border: 1px solid var(--accent-cyan);
          color: #c5f2f7;
        }
        .connection-status-panel {
          display: flex;
          flex-direction: column;
        }
        .status-indicator-box {
          display: flex;
          gap: 1rem;
          align-items: center;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
        }
        .status-indicator-box.active {
          border-color: rgba(16, 185, 129, 0.3);
          background-color: rgba(16, 185, 129, 0.03);
        }
        .status-indicator-box.active .indicator-dot {
          background-color: var(--accent-green);
          box-shadow: 0 0 10px var(--accent-green);
        }
        .status-indicator-box.inactive .indicator-dot {
          background-color: var(--accent-pink);
          box-shadow: 0 0 10px var(--accent-pink);
        }
        .indicator-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-indicator-box h4 {
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
        }
        .status-indicator-box p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
export default Config;
