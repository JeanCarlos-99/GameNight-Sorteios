import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { dbManager } from './database';
import type { DatabaseProvider, Event, Participant, Prize, Raffle, RaffleWithDetails, Winner, SupabaseConfig } from './database';

export class SupabaseDatabaseProvider implements DatabaseProvider {
  public readonly isMock = false;
  public client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  // --- EVENTOS ---
  async listEvents(): Promise<Event[]> {
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createEvent(name: string): Promise<Event> {
    const { data, error } = await this.client
      .from('events')
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.client
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // --- PARTICIPANTES ---
  async listParticipants(eventId: string): Promise<Participant[]> {
    const { data, error } = await this.client
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async addParticipant(participant: Omit<Participant, 'id' | 'created_at' | 'registration_date'>): Promise<Participant> {
    const { data, error } = await this.client
      .from('participants')
      .insert([participant])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Participante duplicado! O número de inscrição, CPF ou e-mail já existe neste evento.');
      }
      throw error;
    }
    return data;
  }

  async updateParticipant(id: string, participant: Partial<Participant>): Promise<Participant> {
    const { data, error } = await this.client
      .from('participants')
      .update(participant)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Já existe outro participante com este número de inscrição, CPF ou e-mail.');
      }
      throw error;
    }
    return data;
  }

  async deleteParticipant(id: string): Promise<void> {
    const { error } = await this.client
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async importParticipants(
    eventId: string,
    list: Omit<Participant, 'id' | 'event_id' | 'created_at' | 'registration_date'>[]
  ): Promise<{ added: number; updated: number }> {
    const formattedList = list.map(item => ({
      event_id: eventId,
      registration_number: item.registration_number,
      name: item.name,
      phone: item.phone,
      email: item.email || null,
      cpf: item.cpf || null,
      status: item.status || 'active'
    }));

    // Upsert no Supabase conflitando nas chaves de registro do evento
    const { data, error } = await this.client
      .from('participants')
      .upsert(formattedList, { onConflict: 'event_id,registration_number' })
      .select('id');

    if (error) throw error;

    // Supabase não diz diretamente quantos foram inseridos ou atualizados,
    // mas retorna a lista de IDs resultantes. Como todos são upserted,
    // nós apenas retornamos a contagem total de afetados.
    const affected = data ? data.length : list.length;
    return { added: affected, updated: 0 };
  }

  // --- PRÊMIOS ---
  async listPrizes(eventId: string): Promise<Prize[]> {
    const { data, error } = await this.client
      .from('prizes')
      .select('*')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async addPrize(prize: Omit<Prize, 'id' | 'created_at'>): Promise<Prize> {
    const { data, error } = await this.client
      .from('prizes')
      .insert([prize])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePrize(id: string, prize: Partial<Prize>): Promise<Prize> {
    const { data, error } = await this.client
      .from('prizes')
      .update(prize)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePrize(id: string): Promise<void> {
    const { error } = await this.client
      .from('prizes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // --- SORTEIOS E HISTÓRICO ---
  async listRaffles(eventId: string): Promise<RaffleWithDetails[]> {
    // 1. Puxar todos os sorteios do evento
    const { data: rafflesData, error: rafflesError } = await this.client
      .from('raffles')
      .select('*, prizes(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (rafflesError) throw rafflesError;
    if (!rafflesData) return [];

    // 2. Puxar ganhadores do evento
    const { data: winnersData, error: winnersError } = await this.client
      .from('winners')
      .select('*, participants(*)')
      .order('drawn_at', { ascending: false });

    if (winnersError) throw winnersError;

    // 3. Puxar contagens de participantes
    const { data: partCountData, error: partCountError } = await this.client
      .from('raffle_participants')
      .select('raffle_id');

    if (partCountError) throw partCountError;

    const countsMap = (partCountData || []).reduce((acc: Record<string, number>, curr) => {
      acc[curr.raffle_id] = (acc[curr.raffle_id] || 0) + 1;
      return acc;
    }, {});

    return rafflesData.map(r => {
      const winnerRecord = (winnersData || []).find(w => w.raffle_id === r.id);
      
      let winnerDetails: RaffleWithDetails['winner'] = undefined;
      if (winnerRecord && winnerRecord.participants) {
        winnerDetails = {
          participant: winnerRecord.participants,
          drawn_at: winnerRecord.drawn_at
        };
      }

      return {
        id: r.id,
        event_id: r.event_id,
        prize_id: r.prize_id,
        name: r.name,
        description: r.description,
        settings: r.settings,
        created_at: r.created_at,
        prize: r.prizes,
        winner: winnerDetails,
        participantsCount: countsMap[r.id] || 0
      };
    });
  }

  async createRaffle(raffle: Omit<Raffle, 'id' | 'created_at'>, eligibleParticipantIds: string[]): Promise<Raffle> {
    // Criar o sorteio
    const { data: newRaffle, error: raffleError } = await this.client
      .from('raffles')
      .insert([raffle])
      .select()
      .single();

    if (raffleError) throw raffleError;

    // Registrar participantes elegíveis no momento do sorteio
    if (eligibleParticipantIds.length > 0) {
      const records = eligibleParticipantIds.map(pid => ({
        raffle_id: newRaffle.id,
        participant_id: pid
      }));
      const { error: partError } = await this.client
        .from('raffle_participants')
        .insert(records);

      if (partError) throw partError;
    }

    return newRaffle;
  }

  async recordWinner(winner: Omit<Winner, 'id' | 'drawn_at'>): Promise<Winner> {
    // 1. Gravar ganhador
    const { data: newWinner, error: winnerError } = await this.client
      .from('winners')
      .insert([winner])
      .select()
      .single();

    if (winnerError) throw winnerError;

    // 2. Atualizar quantidade do prêmio no Supabase
    // Primeiro pegar a quantidade atual do prêmio
    const { data: prizeData, error: prizeFetchError } = await this.client
      .from('prizes')
      .select('quantity')
      .eq('id', winner.prize_id)
      .single();

    if (!prizeFetchError && prizeData) {
      const nextQuantity = Math.max(0, prizeData.quantity - 1);
      const nextStatus = nextQuantity === 0 ? 'drawn' : 'available';

      await this.client
        .from('prizes')
        .update({ quantity: nextQuantity, status: nextStatus })
        .eq('id', winner.prize_id);
    }

    return newWinner;
  }

  async getRaffleEligibleParticipants(raffleId: string): Promise<Participant[]> {
    const { data, error } = await this.client
      .from('raffle_participants')
      .select('participants(*)')
      .eq('raffle_id', raffleId);

    if (error) throw error;
    return (data || []).map(d => d.participants).filter(Boolean) as unknown as Participant[];
  }

  // --- MÉTODOS DE CONFIGURAÇÃO DE CREDENCIAIS ---
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
    dbManager.reconnect();
  }
}
export default SupabaseDatabaseProvider;
