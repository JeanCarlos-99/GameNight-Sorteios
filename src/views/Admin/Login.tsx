import React, { useState } from 'react';
import { authService } from '../../services/auth';
import { dbManager } from '../../services/database';
import { ShieldAlert, Key, User, Terminal } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (email: string) => void;
  onCancel?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMock = dbManager.db.isMock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await authService.signIn(email.trim(), password);
      onLoginSuccess(user.email);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="card login-card winner-pulse">
        <div className="login-header">
          <ShieldAlert size={36} className="neon-icon-pink" />
          <h2>Acesso Admin</h2>
          <p>Painel de Controle GameNight</p>
        </div>

        {error && (
          <div className="alert-box error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail Administrativo</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="email"
                className="form-control"
                placeholder="nome@gamenight.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-with-icon">
              <Key size={16} className="input-icon" />
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            {onCancel && (
              <button 
                type="button" 
                className="btn btn-secondary w-full" 
                onClick={onCancel}
                disabled={loading}
              >
                Voltar
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        {isMock && (
          <div className="demo-credentials-helper">
            <Terminal size={14} className="neon-icon-cyan" />
            <div>
              <strong>Modo de Teste Local Ativo:</strong>
              <p>Email: <code>admin@gamenight.com</code></p>
              <p>Senha: <code>gamenight2026</code></p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .login-wrapper {
          min-height: 80vh;
          display: grid;
          place-items: center;
          padding: 1rem;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          border-color: var(--border-color);
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-header h2 {
          margin-top: 0.75rem;
          font-size: 1.5rem;
          background: linear-gradient(135deg, white, var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .login-header p {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }
        .input-with-icon {
          position: relative;
        }
        .input-with-icon .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .input-with-icon input {
          padding-left: 2.75rem;
        }
        .alert-box {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1.25rem;
          font-size: 0.85rem;
        }
        .alert-box.error {
          background-color: rgba(244, 63, 94, 0.1);
          border: 1px solid var(--accent-red);
          color: #fda4af;
        }
        .demo-credentials-helper {
          margin-top: 2rem;
          padding: 1rem;
          background-color: rgba(6, 182, 212, 0.05);
          border: 1px solid rgba(6, 182, 212, 0.15);
          border-radius: 6px;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .demo-credentials-helper code {
          background-color: rgba(255, 255, 255, 0.08);
          color: var(--accent-cyan);
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          font-family: monospace;
        }
        .w-full {
          width: 100%;
        }
        .neon-icon-cyan {
          color: var(--accent-cyan);
          filter: drop-shadow(0 0 4px var(--accent-cyan-glow));
        }
      `}</style>
    </div>
  );
};
export default Login;
