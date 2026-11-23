import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbManager } from '../services/database';
import type { Event } from '../services/database';

interface EventContextType {
  events: Event[];
  activeEvent: Event | null;
  loading: boolean;
  selectEvent: (eventId: string) => void;
  createEvent: (name: string) => Promise<Event>;
  deleteEvent: (eventId: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const db = dbManager.db;
      const list = await db.listEvents();
      setEvents(list);

      // Restaurar o evento ativo do localStorage ou selecionar o primeiro
      const savedActiveId = localStorage.getItem('gn_active_event_id');
      if (savedActiveId && list.some(e => e.id === savedActiveId)) {
        setActiveEvent(list.find(e => e.id === savedActiveId) || null);
      } else if (list.length > 0) {
        setActiveEvent(list[0]);
        localStorage.setItem('gn_active_event_id', list[0].id);
      } else {
        setActiveEvent(null);
        localStorage.removeItem('gn_active_event_id');
      }
    } catch (error) {
      console.error('Erro ao listar eventos no contexto:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Inscrever-se para mudanças de provedor de banco de dados
    const unsubscribe = dbManager.subscribe(() => {
      fetchEvents();
    });
    return () => unsubscribe();
  }, []);

  const selectEvent = (eventId: string) => {
    const selected = events.find(e => e.id === eventId) || null;
    setActiveEvent(selected);
    if (selected) {
      localStorage.setItem('gn_active_event_id', selected.id);
    } else {
      localStorage.removeItem('gn_active_event_id');
    }
  };

  const createEvent = async (name: string): Promise<Event> => {
    const db = dbManager.db;
    const newEvent = await db.createEvent(name);
    
    // Atualizar lista e selecionar novo evento
    setEvents(prev => [newEvent, ...prev]);
    setActiveEvent(newEvent);
    localStorage.setItem('gn_active_event_id', newEvent.id);
    
    return newEvent;
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    const db = dbManager.db;
    await db.deleteEvent(eventId);
    
    // Remover da lista local
    const nextEvents = events.filter(e => e.id !== eventId);
    setEvents(nextEvents);
    
    // Se o evento deletado era o ativo, atualizar
    if (activeEvent?.id === eventId) {
      if (nextEvents.length > 0) {
        setActiveEvent(nextEvents[0]);
        localStorage.setItem('gn_active_event_id', nextEvents[0].id);
      } else {
        setActiveEvent(null);
        localStorage.removeItem('gn_active_event_id');
      }
    }
  };

  return (
    <EventContext.Provider value={{
      events,
      activeEvent,
      loading,
      selectEvent,
      createEvent,
      deleteEvent,
      refreshEvents: fetchEvents
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent deve ser usado dentro de um EventProvider');
  }
  return context;
};
