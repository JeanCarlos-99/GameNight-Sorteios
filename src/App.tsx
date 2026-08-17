import React, { useState, useEffect } from 'react';
import { EventProvider } from './context/EventContext';
import { authService } from './services/auth';
import type { AdminUser } from './services/auth';
import type { Participant, RaffleSettings } from './services/database';

// Componentes
import Sidebar from './components/Sidebar';

// Views
import Dashboard from './views/Dashboard/Dashboard';
import Participants from './views/Participants/Participants';
import Prizes from './views/Prizes/Prizes';
import Raffles from './views/Raffles/Raffles';
import RaffleScreen from './views/RaffleScreen/RaffleScreen';
import History from './views/History/History';
import Login from './views/Admin/Login';
import Config from './views/Admin/Config';

export const App: React.FC = () => {
  const [currentView, setView] = useState<string>('dashboard');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Estados de Sorteio Ativo (Modo Apresentação)
  const [activeRaffleData, setActiveRaffleData] = useState<{
    name: string;
    description: string;
    prizeId: string;
    settings: RaffleSettings;
  } | null>(null);
  
  const [activeEligibleParticipants, setActiveEligibleParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    // Inscrever-se nas mudanças de autenticação
    const unsubscribe = authService.subscribe(user => {
      setAdminUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (_email: string) => {
    setView('dashboard');
  };

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair da administração?')) {
      await authService.signOut();
      setView('dashboard');
    }
  };

  const handleLaunchRaffle = (
    raffleData: { name: string; description: string; prizeId: string; settings: RaffleSettings },
    eligibleParticipants: Participant[]
  ) => {
    setActiveRaffleData(raffleData);
    setActiveEligibleParticipants(eligibleParticipants);
    setView('raffle-screen');
  };

  const handleBackToSetup = () => {
    setActiveRaffleData(null);
    setActiveEligibleParticipants([]);
    setView('raffles');
  };

  const isAdmin = adminUser !== null;

  // Renderização condicional da View Ativa
  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard setView={setView} />;
      case 'participants':
        return <Participants isAdmin={isAdmin} setView={setView} />;
      case 'prizes':
        return <Prizes isAdmin={isAdmin} setView={setView} />;
      case 'raffles':
        return (
          <Raffles 
            isAdmin={isAdmin} 
            setView={setView} 
            onLaunchRaffle={handleLaunchRaffle} 
          />
        );
      case 'history':
        return <History />;
      case 'login':
        return <Login onLoginSuccess={handleLoginSuccess} onCancel={() => setView('dashboard')} />;
      case 'config':
        return <Config />;
      default:
        return <Dashboard setView={setView} />;
    }
  };

  // Se a view ativa for a tela de apresentação do sorteio, renderiza limpo (sem menus)
  if (currentView === 'raffle-screen' && activeRaffleData && activeEligibleParticipants.length > 0) {
    return (
      <EventProvider>
        <RaffleScreen
          raffleData={activeRaffleData}
          eligibleParticipants={activeEligibleParticipants}
          onBackToSetup={handleBackToSetup}
        />
      </EventProvider>
    );
  }

  return (
    <EventProvider>
      <div className="app-container">
        {/* Menu Lateral do Organizador */}
        <Sidebar
          currentView={currentView}
          setView={setView}
          adminEmail={adminUser ? adminUser.email : null}
          onLogout={handleLogout}
        />

        {/* Painel Principal */}
        <main className="main-content">
          {renderActiveView()}
        </main>
      </div>
    </EventProvider>
  );
};
export default App;
