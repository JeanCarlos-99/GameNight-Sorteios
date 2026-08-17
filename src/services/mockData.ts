import { dbManager } from './database';
import type { DatabaseProvider, Event, Participant, Prize, Raffle, RaffleWithDetails, Winner, SupabaseConfig } from './database';

// Participantes de Exemplo para a importação simulada (100 participantes gamer)
export const MOCK_REGISTRATIONS_POOL = Array.from({ length: 100 }).map((_, index) => {
  const gamerNicknames = [
    'Shroud', 'Fallen', 'Coldzera', 'S1mple', 'ZywOo', 'XuxaGamer', 'CyberKnight', 'ShadowBlade',
    'PixelArt', 'Neo', 'Trinity', 'Morpheus', 'Link', 'Zelda', 'Mario', 'Luigi', 'Bowser', 'Peach',
    'Kratos', 'Atreus', 'Aloy', 'Geralt', 'Yennefer', 'Ciri', 'MasterChief', 'Cortana', 'DoomSlayer',
    'Gordon', 'Alyx', 'Chell', 'Ezio', 'Altair', 'Connor', 'Kenway', 'V', 'Johnny', 'Panam', 'Judy',
    'Marcus', 'Dom', 'Cole', 'Baird', 'Samus', 'Ridley', 'Fox', 'Falco', 'Slippy', 'Peppy',
    'Sonic', 'Tails', 'Knuckles', 'Shadow', 'Crash', 'Coco', 'Spyro', 'Ratchet', 'Clank', 'Jak',
    'Daxter', 'Sly', 'Cooper', 'Bentley', 'Murray', 'Dante', 'Vergil', 'Nero', 'Leon', 'Claire',
    'Ada', 'Chris', 'Jill', 'Wesker', 'Arthur', 'John', 'Dutch', 'Sadie', 'Micah', 'Charles',
    'Hosea', 'Lenny', 'Sean', 'Bill', 'Javier', 'Uncle', 'Trevor', 'Michael', 'Franklin', 'Lester',
    'Lara', 'Croft', 'Nathan', 'Drake', 'Sully', 'Elena', 'Chloe', 'Cloud', 'Tifa', 'Aerith',
    'Barret', 'Sephiroth', 'Sora', 'Riku'
  ];

  const firstNames = [
    'João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Carlos', 'Beatriz', 'Mateus', 'Camila',
    'Gustavo', 'Letícia', 'Felipe', 'Larissa', 'Thiago', 'Amanda', 'Bruno', 'Gabriela', 'Rafael',
    'Isabela', 'Daniel', 'Mariana', 'Rodrigo', 'Carolina', 'Vinícius', 'Fernanda', 'André', 'Luana',
    'Guilherme', 'Patrícia', 'Diego', 'Juliana', 'Leonardo', 'Bianca', 'Arthur', 'Clara', 'Gabriel',
    'Alice', 'Eduardo', 'Sofia', 'Ricardo', 'Manuela', 'Marcelo', 'Laura', 'Renan', 'Giovanna'
  ];

  const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima',
    'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Dias',
    'Barbosa', 'Vieira', 'Rocha', 'Nascimento', 'Cardoso', 'Teixeira', 'Araújo', 'Melo', 'Coelho',
    'Mendes', 'Nunes', 'Castro', 'Pinto', 'Barros', 'Ramos', 'Santana', 'Delgado', 'Pires'
  ];

  const nick = gamerNicknames[index % gamerNicknames.length];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  const fullName = `${first} "${nick}" ${last}`;

  const regNum = (index + 1).toString().padStart(3, '0');
  
  // Geradores de dados realistas
  const ddd = [11, 21, 31, 41, 51, 61, 71, 81, 91][index % 9];
  const phone = `(${ddd}) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const cpf = `${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}`;
  const email = `${nick.toLowerCase().replace(/[^a-z0-9]/g, '')}${index}@gamenight.com.br`;

  return {
    registration_number: regNum,
    name: fullName,
    phone: phone,
    email: email,
    cpf: cpf,
    status: 'active' as const
  };
});

export class MockDatabaseProvider implements DatabaseProvider {
  public readonly isMock = true;

  constructor() {
    this.initLocalStorage();
  }

  private initLocalStorage() {
    if (!localStorage.getItem('gn_events')) {
      const defaultEvent: Event = {
        id: 'evt-default-1',
        name: 'GameNight — Novembro 2026',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('gn_events', JSON.stringify([defaultEvent]));
      localStorage.setItem('gn_active_event_id', defaultEvent.id);

      // Criar prêmios padrão
      const defaultPrizes: Prize[] = [
        {
          id: 'prz-1',
          event_id: defaultEvent.id,
          name: 'PlayStation 5 Slim 1TB',
          description: 'Console PlayStation 5 Slim com leitor de disco, controle DualSense e 1TB de armazenamento SSD.',
          quantity: 1,
          status: 'available',
          created_at: new Date().toISOString()
        },
        {
          id: 'prz-2',
          event_id: defaultEvent.id,
          name: 'Headset Gamer HyperX Cloud III',
          description: 'Headset gamer com som surround 7.1 espacial DTS Headphone:X, microfone removível e espuma Memory Foam.',
          quantity: 2,
          status: 'available',
          created_at: new Date().toISOString()
        },
        {
          id: 'prz-3',
          event_id: defaultEvent.id,
          name: 'Mouse Gamer Logitech G502 LIGHTSPEED',
          description: 'Mouse gamer sem fio com sensor HERO 25K, iluminação RGB LIGHTSYNC e pesos ajustáveis.',
          quantity: 1,
          status: 'available',
          created_at: new Date().toISOString()
        },
        {
          id: 'prz-4',
          event_id: defaultEvent.id,
          name: 'Teclado Mecânico Razer BlackWidow V4',
          description: 'Teclado mecânico gamer switches Razer Green tácteis, retroiluminação Chroma RGB e teclas macro dedicadas.',
          quantity: 2,
          status: 'available',
          created_at: new Date().toISOString()
        },
        {
          id: 'prz-5',
          event_id: defaultEvent.id,
          name: 'Cadeira Gamer DXRacer Prince',
          description: 'Cadeira ergonômica com estofamento em poliuretano, braços ajustáveis e inclinação de até 135 graus.',
          quantity: 1,
          status: 'available',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('gn_prizes', JSON.stringify(defaultPrizes));
      
      // Importar automaticamente os primeiros 15 participantes para o usuário ver o app populado
      const initialParticipants: Participant[] = MOCK_REGISTRATIONS_POOL.slice(0, 15).map((p, i) => ({
        id: `part-${i}`,
        event_id: defaultEvent.id,
        ...p,
        registration_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      }));
      localStorage.setItem('gn_participants', JSON.stringify(initialParticipants));
      localStorage.setItem('gn_raffles', JSON.stringify([]));
      localStorage.setItem('gn_raffle_participants', JSON.stringify([]));
      localStorage.setItem('gn_winners', JSON.stringify([]));
    }
  }

  // Helper genérico para buscar listas do LocalStorage
  private getList<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // Helper genérico para salvar listas no LocalStorage
  private setList<T>(key: string, list: T[]): void {
    localStorage.setItem(key, JSON.stringify(list));
  }

  // --- EVENTOS ---
  async listEvents(): Promise<Event[]> {
    return this.getList<Event>('gn_events');
  }

  async createEvent(name: string): Promise<Event> {
    const events = this.getList<Event>('gn_events');
    const newEvent: Event = {
      id: `evt-${Math.random().toString(36).substr(2, 9)}`,
      name,
      created_at: new Date().toISOString()
    };
    events.push(newEvent);
    this.setList('gn_events', events);
    return newEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    const events = this.getList<Event>('gn_events').filter(e => e.id !== id);
    this.setList('gn_events', events);

    // Cascata local
    const participants = this.getList<Participant>('gn_participants').filter(p => p.event_id !== id);
    this.setList('gn_participants', participants);

    const prizes = this.getList<Prize>('gn_prizes').filter(p => p.event_id !== id);
    this.setList('gn_prizes', prizes);

    const raffles = this.getList<Raffle>('gn_raffles').filter(r => r.event_id !== id);
    this.setList('gn_raffles', raffles);
  }

  // --- PARTICIPANTES ---
  async listParticipants(eventId: string): Promise<Participant[]> {
    return this.getList<Participant>('gn_participants').filter(p => p.event_id === eventId);
  }

  async addParticipant(participant: Omit<Participant, 'id' | 'created_at' | 'registration_date'>): Promise<Participant> {
    const participants = this.getList<Participant>('gn_participants');
    
    // Validar duplicatas locais
    const duplicate = participants.find(
      p => p.event_id === participant.event_id && 
      (p.registration_number.toLowerCase() === participant.registration_number.toLowerCase() ||
       (participant.cpf && p.cpf === participant.cpf) ||
       (participant.email && p.email?.toLowerCase() === participant.email.toLowerCase()))
    );

    if (duplicate) {
      throw new Error(`Participante duplicado! O número de inscrição, CPF ou e-mail já existe neste evento.`);
    }

    const newParticipant: Participant = {
      ...participant,
      id: `part-${Math.random().toString(36).substr(2, 9)}`,
      registration_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    participants.push(newParticipant);
    this.setList('gn_participants', participants);
    return newParticipant;
  }

  async updateParticipant(id: string, updatedFields: Partial<Participant>): Promise<Participant> {
    const participants = this.getList<Participant>('gn_participants');
    const idx = participants.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Participante não encontrado.');

    // Validar duplicatas antes de atualizar
    if (updatedFields.registration_number || updatedFields.cpf || updatedFields.email) {
      const pOrig = participants[idx];
      const dup = participants.find(
        p => p.id !== id && p.event_id === pOrig.event_id &&
        ((updatedFields.registration_number && p.registration_number.toLowerCase() === updatedFields.registration_number.toLowerCase()) ||
         (updatedFields.cpf && p.cpf === updatedFields.cpf) ||
         (updatedFields.email && p.email?.toLowerCase() === updatedFields.email.toLowerCase()))
      );
      if (dup) {
        throw new Error('Já existe outro participante com este número de inscrição, CPF ou e-mail.');
      }
    }

    const updatedParticipant = {
      ...participants[idx],
      ...updatedFields
    } as Participant;

    participants[idx] = updatedParticipant;
    this.setList('gn_participants', participants);
    return updatedParticipant;
  }

  async deleteParticipant(id: string): Promise<void> {
    const participants = this.getList<Participant>('gn_participants').filter(p => p.id !== id);
    this.setList('gn_participants', participants);
    
    // Remover de ganhadores ou sorteios se houver
    const winners = this.getList<Winner>('gn_winners').filter(w => w.participant_id !== id);
    this.setList('gn_winners', winners);
  }

  async importParticipants(
    eventId: string, 
    list: Omit<Participant, 'id' | 'event_id' | 'created_at' | 'registration_date'>[]
  ): Promise<{ added: number; updated: number }> {
    const participants = this.getList<Participant>('gn_participants');
    let added = 0;
    let updated = 0;

    for (const item of list) {
      const idx = participants.findIndex(
        p => p.event_id === eventId && (
          p.registration_number.toLowerCase() === item.registration_number.toLowerCase() ||
          (item.cpf && p.cpf === item.cpf) ||
          (item.email && p.email?.toLowerCase() === item.email.toLowerCase())
        )
      );

      if (idx !== -1) {
        participants[idx] = {
          ...participants[idx],
          ...item,
          status: item.status || 'active'
        };
        updated++;
      } else {
        participants.push({
          ...item,
          id: `part-${Math.random().toString(36).substr(2, 9)}`,
          event_id: eventId,
          registration_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        added++;
      }
    }

    this.setList('gn_participants', participants);
    return { added, updated };
  }

  // --- PRÊMIOS ---
  async listPrizes(eventId: string): Promise<Prize[]> {
    return this.getList<Prize>('gn_prizes').filter(p => p.event_id === eventId);
  }

  async addPrize(prize: Omit<Prize, 'id' | 'created_at'>): Promise<Prize> {
    const prizes = this.getList<Prize>('gn_prizes');
    const newPrize: Prize = {
      ...prize,
      id: `prz-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    prizes.push(newPrize);
    this.setList('gn_prizes', prizes);
    return newPrize;
  }

  async updatePrize(id: string, updatedFields: Partial<Prize>): Promise<Prize> {
    const prizes = this.getList<Prize>('gn_prizes');
    const idx = prizes.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Prêmio não encontrado.');

    const updatedPrize = {
      ...prizes[idx],
      ...updatedFields
    } as Prize;

    prizes[idx] = updatedPrize;
    this.setList('gn_prizes', prizes);
    return updatedPrize;
  }

  async deletePrize(id: string): Promise<void> {
    const prizes = this.getList<Prize>('gn_prizes').filter(p => p.id !== id);
    this.setList('gn_prizes', prizes);
  }

  // --- SORTEIOS E GANHADORES ---
  async listRaffles(eventId: string): Promise<RaffleWithDetails[]> {
    const raffles = this.getList<Raffle>('gn_raffles').filter(r => r.event_id === eventId);
    const prizes = this.getList<Prize>('gn_prizes');
    const winners = this.getList<Winner>('gn_winners');
    const participants = this.getList<Participant>('gn_participants');
    const raffleParticipants = this.getList<{ raffle_id: string; participant_id: string }>('gn_raffle_participants');

    return raffles.map(r => {
      const prize = prizes.find(p => p.id === r.prize_id)!;
      const winnerRecord = winners.find(w => w.raffle_id === r.id);
      
      let winnerDetails: RaffleWithDetails['winner'] = undefined;
      if (winnerRecord) {
        const pDet = participants.find(p => p.id === winnerRecord.participant_id)!;
        winnerDetails = {
          participant: pDet,
          drawn_at: winnerRecord.drawn_at
        };
      }

      const pCount = raffleParticipants.filter(rp => rp.raffle_id === r.id).length;

      return {
        ...r,
        prize,
        winner: winnerDetails,
        participantsCount: pCount
      };
    });
  }

  async createRaffle(raffle: Omit<Raffle, 'id' | 'created_at'>, eligibleParticipantIds: string[]): Promise<Raffle> {
    const raffles = this.getList<Raffle>('gn_raffles');
    const newRaffle: Raffle = {
      ...raffle,
      id: `raf-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    raffles.push(newRaffle);
    this.setList('gn_raffles', raffles);

    // Gravar participantes elegíveis no momento do sorteio (para histórico/auditoria)
    const raffleParticipants = this.getList<{ raffle_id: string; participant_id: string }>('gn_raffle_participants');
    eligibleParticipantIds.forEach(pid => {
      raffleParticipants.push({
        raffle_id: newRaffle.id,
        participant_id: pid
      });
    });
    this.setList('gn_raffle_participants', raffleParticipants);

    return newRaffle;
  }

  async recordWinner(winner: Omit<Winner, 'id' | 'drawn_at'>): Promise<Winner> {
    const winners = this.getList<Winner>('gn_winners');
    const newWinner: Winner = {
      ...winner,
      id: `win-${Math.random().toString(36).substr(2, 9)}`,
      drawn_at: new Date().toISOString()
    };
    winners.push(newWinner);
    this.setList('gn_winners', winners);

    // Atualizar status do prêmio
    const prizes = this.getList<Prize>('gn_prizes');
    const prizeIdx = prizes.findIndex(p => p.id === winner.prize_id);
    if (prizeIdx !== -1) {
      // Subtrair quantidade disponível, se chegar a 0 marca como sorteado
      prizes[prizeIdx].quantity = Math.max(0, prizes[prizeIdx].quantity - 1);
      if (prizes[prizeIdx].quantity === 0) {
        prizes[prizeIdx].status = 'drawn';
      }
      this.setList('gn_prizes', prizes);
    }

    return newWinner;
  }

  async getRaffleEligibleParticipants(raffleId: string): Promise<Participant[]> {
    const raffleParticipants = this.getList<{ raffle_id: string; participant_id: string }>('gn_raffle_participants')
      .filter(rp => rp.raffle_id === raffleId)
      .map(rp => rp.participant_id);

    const participants = this.getList<Participant>('gn_participants');
    return participants.filter(p => raffleParticipants.includes(p.id));
  }

  // --- CONFIGURAÇÃO SUPABASE ---
  getSupabaseConfig(): SupabaseConfig | null {
    const configStr = localStorage.getItem('gamenight_supabase_config');
    return configStr ? JSON.parse(configStr) : null;
  }

  setSupabaseConfig(config: SupabaseConfig | null): void {
    if (config) {
      localStorage.setItem('gamenight_supabase_config', JSON.stringify(config));
    } else {
      localStorage.removeItem('gamenight_supabase_config');
    }
    // Forçar dbManager a atualizar o provedor ativo
    dbManager.reconnect();
  }
}
export default MockDatabaseProvider;
