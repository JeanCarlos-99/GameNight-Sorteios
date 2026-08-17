import React, { useState, useEffect, useRef } from 'react';
import { dbManager } from '../../services/database';
import type { Participant, Prize, RaffleSettings } from '../../services/database';
import { Tv, AlertTriangle, ArrowLeft, RotateCcw, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RaffleScreenProps {
  raffleData: { name: string; description: string; prizeId: string; settings: RaffleSettings };
  eligibleParticipants: Participant[];
  onBackToSetup: () => void;
}

export const RaffleScreen: React.FC<RaffleScreenProps> = ({ 
  raffleData, 
  eligibleParticipants, 
  onBackToSetup 
}) => {
  const [prize, setPrize] = useState<Prize | null>(null);
  
  // Estados de Sorteio
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [showWinnerCard, setShowWinnerCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Referências para a animação do rolo (slot machine)
  const [visibleNames, setVisibleNames] = useState<Participant[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const tickerIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Carregar informações do prêmio
  useEffect(() => {
    const fetchPrize = async () => {
      try {
        const db = dbManager.db;
        const prizeList = await db.listPrizes(eligibleParticipants[0].event_id);
        const p = prizeList.find(item => item.id === raffleData.prizeId);
        if (p) setPrize(p);
      } catch (err) {
        console.error('Erro ao buscar prêmio:', err);
      }
    };
    fetchPrize();
  }, [raffleData, eligibleParticipants]);

  // Inicializar lista de nomes visíveis no ticker (embaralhado)
  useEffect(() => {
    // Pegar nomes dos participantes para encher a roleta
    if (eligibleParticipants.length > 0) {
      const shuffled = [...eligibleParticipants].sort(() => Math.random() - 0.5);
      
      // Duplicar a lista se for pequena para a animação rolar bem
      let list = shuffled;
      while (list.length < 30) {
        list = [...list, ...shuffled.sort(() => Math.random() - 0.5)];
      }
      setVisibleNames(list);
    }
  }, [eligibleParticipants]);

  // Sintetizador de Áudio Gamer (Web Audio API)
  const playSynthSound = (type: 'tick' | 'victory') => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      
      // Resgatar caso esteja suspenso pelo navegador
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'tick') {
        // Som rápido de roleta girando (retro arcade tick)
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime); // Som agudo
        gainNode.gain.setValueAtTime(0.03, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'victory') {
        // Som de vitória (arpejo clássico gamer 8-bits)
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Notas C maior
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'triangle'; // Timbre retrô
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);
          
          gainNode.gain.setValueAtTime(0.06, ctx.currentTime + index * 0.12);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.25);
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start(ctx.currentTime + index * 0.12);
          osc.stop(ctx.currentTime + index * 0.12 + 0.25);
        });
      }
    } catch (e) {
      console.warn('Erro ao reproduzir Web Audio:', e);
    }
  };

  // Função principal de Sorteio
  const handleStartDraw = async () => {
    if (isDrawing) return;
    setIsDrawing(true);
    setWinner(null);
    setShowWinnerCard(false);
    setError(null);

    // Re-iniciar Audio Context se necessário (interação do usuário)
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch {}

    try {
      const db = dbManager.db;

      // 1. Selecionar o ganhador de forma criptograficamente segura antes da animação terminar
      const cryptoArray = new Uint32Array(1);
      window.crypto.getRandomValues(cryptoArray);
      const winnerIndex = cryptoArray[0] % eligibleParticipants.length;
      const selectedWinner = eligibleParticipants[winnerIndex];

      // 2. Criar a entrada do Sorteio no banco de dados
      const createdRaffle = await db.createRaffle(
        {
          event_id: selectedWinner.event_id,
          prize_id: raffleData.prizeId,
          name: raffleData.name,
          description: raffleData.description,
          settings: raffleData.settings
        },
        eligibleParticipants.map(p => p.id) // Histórico de elegibilidade
      );

      // 3. Gravar o ganhador no banco de dados ANTES de exibir na tela (Garante integridade e auditoria)
      await db.recordWinner({
        raffle_id: createdRaffle.id,
        participant_id: selectedWinner.id,
        prize_id: raffleData.prizeId
      });

      // 4. Iniciar a animação visual da roleta
      animateTicker(selectedWinner);
    } catch (err) {
      console.error(err);
      setError('Erro ao registrar sorteio no banco de dados. Tente novamente.');
      setIsDrawing(false);
    }
  };

  const animateTicker = (drawnWinner: Participant) => {
    let speed = 40; // Tempo inicial de transição em ms
    let counter = 0;
    const maxSteps = 45; // Número de passos antes de parar
    
    // Garantir que a lista possua o vencedor e posicioná-lo no local correto
    const currentList = [...visibleNames];
    
    // Substituir a última posição onde o rolo irá parar pelo vencedor real
    const stopPosition = maxSteps % currentList.length;
    currentList[stopPosition] = drawnWinner;
    setVisibleNames(currentList);

    const tick = () => {
      counter++;
      setActiveIndex(prev => (prev + 1) % currentList.length);
      playSynthSound('tick');

      if (counter < maxSteps) {
        // Desacelerar gradativamente
        if (counter > maxSteps * 0.8) {
          speed += 75; // Desacelera bem rápido no final
        } else if (counter > maxSteps * 0.6) {
          speed += 35;
        } else if (counter > maxSteps * 0.3) {
          speed += 12;
        }
        tickerIntervalRef.current = window.setTimeout(tick, speed);
      } else {
        // Parar no Vencedor
        setActiveIndex(stopPosition);
        setWinner(drawnWinner);
        setIsDrawing(false);
        revealWinner();
      }
    };

    tickerIntervalRef.current = window.setTimeout(tick, speed);
  };

  // Limpar timeouts/intervals
  useEffect(() => {
    return () => {
      if (tickerIntervalRef.current) clearTimeout(tickerIntervalRef.current);
    };
  }, []);

  const revealWinner = () => {
    setShowWinnerCard(true);
    playSynthSound('victory');
    
    // Efeito de confetes no projetor
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  // Re-sortear
  const handleRedrawConfirm = () => {
    const confirm = window.confirm(
      'ATENÇÃO: Deseja realmente realizar um novo sorteio?\nEsta ação criará um novo registro de sorteio no banco de dados. O prêmio anterior já foi debitado.'
    );
    if (confirm) {
      // Filtrar o ganhador atual da lista de elegíveis se a regra do sorteio exigir
      const nextEligible = eligibleParticipants.filter(p => p.id !== winner?.id);
      
      if (nextEligible.length === 0) {
        alert('Não há mais participantes elegíveis para re-sortear.');
        return;
      }
      
      // Reiniciar estado
      setWinner(null);
      setShowWinnerCard(false);
      
      // Iniciar sorteio automaticamente com o novo pool filtrado
      // Para manter a segurança, passamos a nova lista elegível
      // (Atualizando o componente via re-trigger)
      setIsDrawing(true);
      
      const db = dbManager.db;
      db.createRaffle(
        {
          event_id: nextEligible[0].event_id,
          prize_id: raffleData.prizeId,
          name: `${raffleData.name} (Re-sorteio)`,
          description: raffleData.description || 'Sorteio re-executado devido a ausência do ganhador original ou similar.',
          settings: raffleData.settings
        },
        nextEligible.map(p => p.id)
      ).then(async (createdRaffle) => {
        const cryptoArray = new Uint32Array(1);
        window.crypto.getRandomValues(cryptoArray);
        const wIndex = cryptoArray[0] % nextEligible.length;
        const newWinner = nextEligible[wIndex];

        await db.recordWinner({
          raffle_id: createdRaffle.id,
          participant_id: newWinner.id,
          prize_id: raffleData.prizeId
        });

        // Rodar ticker
        animateTicker(newWinner);
      }).catch(err => {
        alert('Erro no re-sorteio: ' + err.message);
        setIsDrawing(false);
      });
    }
  };

  // Determinar a posição do ticker (transform Y) para o efeito roleta
  const getTickerStyle = () => {
    // Cada item tem 60px de altura
    const offset = -(activeIndex * 60) + 30; // 30px para centralizar
    return {
      transform: `translateY(${offset}px)`,
      transition: isDrawing ? 'transform 0.05s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    };
  };

  return (
    <div className="presentation-container">
      {/* Top Header Apresentação */}
      <div className="presentation-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, position: 'absolute', top: '1.5rem', left: '0', padding: '0 2rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBackToSetup} disabled={isDrawing} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className={`btn btn-secondary btn-sm ${audioEnabled ? 'active' : ''}`}
            onClick={() => setAudioEnabled(!audioEnabled)}
            title="Ativar/Desativar Sons"
          >
            <Volume2 size={14} style={{ color: audioEnabled ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
          </button>
          <div className="presentation-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-gamer)', fontSize: '0.75rem', border: '1px solid var(--border-color)', padding: '0.4rem 0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
            <Tv size={14} className="neon-icon-cyan" /> MODO APRESENTAÇÃO
          </div>
        </div>
      </div>

      <div className="presentation-content">
        <h1 className="gamenight-main-title">GAMENIGHT</h1>
        <h2 className="raffle-subtitle">{raffleData.name}</h2>
        
        {prize && (
          <div className="prize-indicator-card" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(139, 92, 246, 0.06)', border: '1.5px solid var(--accent-purple)', padding: '0.6rem 1.5rem', borderRadius: '50px', boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'var(--font-gamer)' }}>Prêmio:</span>
            <strong style={{ color: '#fff', fontSize: '1.25rem', fontFamily: 'var(--font-body)', fontWeight: 600 }}>{prize.name}</strong>
          </div>
        )}

        {error && (
          <div className="alert-box error" style={{ maxWidth: '500px', margin: '2rem auto' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Roleta de Nomes */}
        {!showWinnerCard && (
          <div style={{ marginTop: '4rem' }}>
            <div className={`raffle-box ${isDrawing ? 'spinning' : ''}`}>
              <div className="raffle-pointer" />
              <div className="ticker-wrapper" style={getTickerStyle()}>
                {visibleNames.map((p, idx) => (
                  <div 
                    key={idx} 
                    className={`ticker-item ${idx === activeIndex ? 'active' : ''}`}
                  >
                    {p.name} {raffleData.settings.showRegistrationNumber && `(#${p.registration_number})`}
                  </div>
                ))}
              </div>
            </div>

            <div className="raffle-action-trigger" style={{ marginTop: '2rem' }}>
              <button 
                className="btn btn-primary btn-lg" 
                style={{ padding: '1.2rem 3rem', fontSize: '1.3rem', width: '280px', borderRadius: '50px' }}
                onClick={handleStartDraw}
                disabled={isDrawing || visibleNames.length === 0}
              >
                {isDrawing ? 'Sorteando...' : 'SORTEAR'}
              </button>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem', fontFamily: 'var(--font-gamer)' }}>
                {eligibleParticipants.length} competidores habilitados
              </p>
            </div>
          </div>
        )}

        {/* Revelação do Vencedor */}
        {showWinnerCard && winner && (
          <div className="winner-reveal winner-pulse" style={{ marginTop: '2.5rem' }}>
            <div className="winner-title">🎉 TEMOS UM GANHADOR! 🎉</div>
            <div className="winner-name">{winner.name}</div>
            
            <div className="winner-registration">
              Inscrição #{winner.registration_number}
            </div>

            <div className="winner-prize-tag">Recompensa</div>
            <div className="winner-prize-name">🏆 {prize?.name}</div>

            <div className="winner-screen-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem' }}>
              <button className="btn btn-secondary" onClick={onBackToSetup} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Voltar ao Painel
              </button>
              <button className="btn btn-danger" onClick={handleRedrawConfirm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={16} /> Sortear Novamente
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .gamenight-main-title {
          font-size: 4rem;
          font-weight: 900;
          letter-spacing: 0.15em;
          background: linear-gradient(135deg, white, var(--accent-pink));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 12px var(--accent-pink-glow));
          margin-bottom: 0.25rem;
        }
        .raffle-subtitle {
          font-size: 1.5rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
        }
        .presentation-badge {
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.15);
        }
        .neon-icon-cyan {
          color: var(--accent-cyan);
          filter: drop-shadow(0 0 4px var(--accent-cyan-glow));
        }
        .winner-screen-actions button {
          min-width: 180px;
          border-radius: 50px;
        }
        .alert-box.error {
          background-color: rgba(244, 63, 94, 0.1);
          border: 1px solid var(--accent-red);
          color: #fda4af;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        @media (max-width: 768px) {
          .gamenight-main-title {
            font-size: 2.25rem;
          }
          .raffle-subtitle {
            font-size: 1.1rem;
          }
          .raffle-box {
            height: 90px;
          }
          .ticker-item {
            font-size: 1.2rem;
            height: 45px;
          }
          .ticker-item.active {
            font-size: 1.5rem;
          }
          .ticker-wrapper {
            /* Ajuste de Y para 45px */
          }
          .winner-screen-actions {
            flex-direction: column;
            align-items: center;
          }
          .winner-screen-actions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
export default RaffleScreen;
