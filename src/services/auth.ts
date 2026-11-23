import { dbManager } from './database';
import { SupabaseDatabaseProvider } from './supabase';

export interface AdminUser {
  id: string;
  email: string;
}

type AuthCallback = (user: AdminUser | null) => void;
const listeners = new Set<AuthCallback>();
let currentUser: AdminUser | null = null;

// Inicializar estado de autenticação a partir do localStorage/sessão Supabase
const initAuth = () => {
  const provider = dbManager.db;

  if (provider.isMock) {
    const savedUser = localStorage.getItem('gn_admin_user');
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
      } catch {
        currentUser = null;
      }
    }
  } else {
    const supabaseProvider = provider as SupabaseDatabaseProvider;
    // Tentar obter a sessão ativa do Supabase
    supabaseProvider.client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        currentUser = {
          id: session.user.id,
          email: session.user.email || ''
        };
      } else {
        currentUser = null;
      }
      notifyListeners();
    });

    // Ouvir mudanças de autenticação no Supabase
    supabaseProvider.client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        currentUser = {
          id: session.user.id,
          email: session.user.email || ''
        };
      } else {
        currentUser = null;
      }
      notifyListeners();
    });
  }
};

// Notificar todos os listeners sobre mudanças de estado
const notifyListeners = () => {
  listeners.forEach(cb => cb(currentUser));
};

// Inscrever-se nas mudanças de autenticação
dbManager.subscribe(() => {
  initAuth();
});

export const authService = {
  // Login
  async signIn(email: string, password: string): Promise<AdminUser> {
    const provider = dbManager.db;

    if (provider.isMock) {
      // Simulação: Aceitar admin@gamenight.com / gamenight2026 ou qualquer outro para testes
      if (email === 'admin@gamenight.com' && password === 'gamenight2026') {
        const user: AdminUser = { id: 'admin-mock-id', email };
        localStorage.setItem('gn_admin_user', JSON.stringify(user));
        currentUser = user;
        notifyListeners();
        return user;
      } else {
        throw new Error('Credenciais inválidas! Use admin@gamenight.com e a senha gamenight2026.');
      }
    } else {
      const supabaseProvider = provider as SupabaseDatabaseProvider;
      const { data, error } = await supabaseProvider.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data.user) throw new Error('Não foi possível obter dados do usuário do Supabase.');

      const user: AdminUser = {
        id: data.user.id,
        email: data.user.email || ''
      };
      currentUser = user;
      notifyListeners();
      return user;
    }
  },

  // Logout
  async signOut(): Promise<void> {
    const provider = dbManager.db;

    if (provider.isMock) {
      localStorage.removeItem('gn_admin_user');
      currentUser = null;
      notifyListeners();
    } else {
      const supabaseProvider = provider as SupabaseDatabaseProvider;
      const { error } = await supabaseProvider.client.auth.signOut();
      if (error) throw error;
      currentUser = null;
      notifyListeners();
    }
  },

  // Obter usuário atual
  getCurrentUser(): AdminUser | null {
    return currentUser;
  },

  // Verificar se está autenticado
  isAuthenticated(): boolean {
    return currentUser !== null;
  },

  // Inscrever-se nas mudanças de estado
  subscribe(callback: AuthCallback): () => void {
    listeners.add(callback);
    callback(currentUser);
    return () => {
      listeners.delete(callback);
    };
  }
};
export default authService;
