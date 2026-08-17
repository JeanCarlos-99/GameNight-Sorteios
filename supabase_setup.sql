-- Script de Configuração do Supabase para GameNight - Sorteios
-- Cole este script no editor SQL do seu projeto Supabase para criar as tabelas e políticas necessárias.

-- 1. Tabela de Eventos
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Participantes
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_number TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_event_registration UNIQUE (event_id, registration_number)
);

-- Indexadores para busca rápida
CREATE INDEX IF NOT EXISTS idx_participants_event ON public.participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_search ON public.participants(name, registration_number);

-- 3. Tabela de Prêmios
CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    quantity INTEGER DEFAULT 1 NOT NULL,
    status TEXT DEFAULT 'available' NOT NULL CHECK (status IN ('available', 'drawn')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prizes_event ON public.prizes(event_id);

-- 4. Tabela de Sorteios
CREATE TABLE IF NOT EXISTS public.raffles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raffles_event ON public.raffles(event_id);

-- 5. Tabela de Participantes Elegíveis no Sorteio (Histórico / Auditoria)
CREATE TABLE IF NOT EXISTS public.raffle_participants (
    raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    PRIMARY KEY (raffle_id, participant_id)
);

-- 6. Tabela de Ganhadores
CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE RESTRICT,
    drawn_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_raffle_winner UNIQUE (raffle_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_winners_raffle ON public.winners(raffle_id);
CREATE INDEX IF NOT EXISTS idx_winners_participant ON public.winners(participant_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura livre (para a Tela de Apresentação e leitura geral do app)
CREATE POLICY "Leitura livre de eventos" ON public.events FOR SELECT USING (true);
CREATE POLICY "Leitura livre de participantes" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Leitura livre de prêmios" ON public.prizes FOR SELECT USING (true);
CREATE POLICY "Leitura livre de sorteios" ON public.raffles FOR SELECT USING (true);
CREATE POLICY "Leitura livre de participantes do sorteio" ON public.raffle_participants FOR SELECT USING (true);
CREATE POLICY "Leitura livre de ganhadores" ON public.winners FOR SELECT USING (true);

-- Políticas para escrita protegida (somente usuários autenticados/administradores)
CREATE POLICY "Modificação de eventos por administradores" ON public.events 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Modificação de participantes por administradores" ON public.participants 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Modificação de prêmios por administradores" ON public.prizes 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Modificação de sorteios por administradores" ON public.raffles 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Modificação de participantes do sorteio por administradores" ON public.raffle_participants 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Modificação de ganhadores por administradores" ON public.winners 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
