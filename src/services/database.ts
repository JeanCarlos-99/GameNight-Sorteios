// Interfaces de Dados para o GameNight - Sorteios

export interface Event {
  id: string;
  name: string;
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  registration_number: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  registration_date: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Prize {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  image_url?: string;
  quantity: number;
  status: 'available' | 'drawn';
  created_at: string;
}

export interface RaffleSettings {
  removeWinnerFromPool: boolean; // Remover da lista deste sorteio após ser sorteado
  preventDrawnAgain: boolean;    // Impedir que seja sorteado novamente no evento
  keepWinnerEligibleForFutureRaffles: boolean; // Manter elegível para outros sorteios
  showRegistrationNumber: boolean; // Mostrar o número da inscrição no sorteio
}

export interface Raffle {
  id: string;
  event_id: string;
  prize_id: string;
  name: string;
  description?: string;
  settings: RaffleSettings;
  created_at: string;
  // Detalhes extras opcionais pré-carregados
  prize?: Prize;
}

export interface Winner {
  id: string;
  raffle_id: string;
  participant_id: string;
  prize_id: string;
  drawn_at: string;
  // Detalhes extras
  participant?: Participant;
  prize?: Prize;
  raffle?: Raffle;
}

export interface RaffleWithDetails extends Raffle {
  prize: Prize;
  winner?: {
    participant: Participant;
    drawn_at: string;
  };
  participantsCount: number;
}

// Configurações do Supabase no Frontend
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Interface de Operações do Banco
export interface DatabaseProvider {
  isMock: boolean;
  
  // Eventos
  listEvents(): Promise<Event[]>;
  createEvent(name: string): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  
  // Participantes
  listParticipants(eventId: string): Promise<Participant[]>;
  addParticipant(participant: Omit<Participant, 'id' | 'created_at' | 'registration_date'>): Promise<Participant>;
  updateParticipant(id: string, participant: Partial<Participant>): Promise<Participant>;
  deleteParticipant(id: string): Promise<void>;
  importParticipants(eventId: string, list: Omit<Participant, 'id' | 'event_id' | 'created_at' | 'registration_date'>[]): Promise<{ added: number; updated: number }>;
  
  // Prêmios
  listPrizes(eventId: string): Promise<Prize[]>;
  addPrize(prize: Omit<Prize, 'id' | 'created_at'>): Promise<Prize>;
  updatePrize(id: string, prize: Partial<Prize>): Promise<Prize>;
  deletePrize(id: string): Promise<void>;
  
  // Sorteios & Histórico
  listRaffles(eventId: string): Promise<RaffleWithDetails[]>;
  createRaffle(raffle: Omit<Raffle, 'id' | 'created_at'>, eligibleParticipantIds: string[]): Promise<Raffle>;
  recordWinner(winner: Omit<Winner, 'id' | 'drawn_at'>): Promise<Winner>;
  getRaffleEligibleParticipants(raffleId: string): Promise<Participant[]>;
  
  // Configuração Supabase Dinâmica
  getSupabaseConfig(): SupabaseConfig | null;
  setSupabaseConfig(config: SupabaseConfig | null): void;
}

// Gerenciador de conexão Supabase / Local
class DatabaseManager {
  private activeProvider: DatabaseProvider;
  private onProviderChangeListeners: Array<(provider: DatabaseProvider) => void> = [];

  constructor() {
    this.activeProvider = this.resolveProvider();
  }

  private resolveProvider(): DatabaseProvider {
    // 1. Verificar se existem chaves salvas no localStorage
    const savedConfigStr = localStorage.getItem('gamenight_supabase_config');
    let savedConfig: SupabaseConfig | null = null;
    if (savedConfigStr) {
      try {
        savedConfig = JSON.parse(savedConfigStr);
      } catch (e) {
        console.error('Erro ao ler chaves do Supabase salvas', e);
      }
    }

    // 2. Verificar se existem chaves nas variáveis de ambiente do Vite
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (savedConfig && savedConfig.url && savedConfig.anonKey) {
      return new SupabaseDatabaseProvider(savedConfig.url, savedConfig.anonKey);
    } else if (envUrl && envKey && envUrl !== 'SEU_SUPABASE_URL_AQUI') {
      return new SupabaseDatabaseProvider(envUrl, envKey);
    } else {
      return new MockDatabaseProvider();
    }
  }

  public get db(): DatabaseProvider {
    return this.activeProvider;
  }

  public subscribe(listener: (provider: DatabaseProvider) => void): () => void {
    this.onProviderChangeListeners.push(listener);
    listener(this.activeProvider);
    return () => {
      this.onProviderChangeListeners = this.onProviderChangeListeners.filter(l => l !== listener);
    };
  }

  public reconnect() {
    this.activeProvider = this.resolveProvider();
    this.onProviderChangeListeners.forEach(l => l(this.activeProvider));
  }
}

export const dbManager = new DatabaseManager();

// Importações atrasadas (resolução de dependência circular)
import { MockDatabaseProvider } from './mockData';
import { SupabaseDatabaseProvider } from './supabase';
