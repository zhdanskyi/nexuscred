'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppView = 'landing' | 'auth' | 'dashboard';

interface AppState {
  view: AppView;
  setView: (v: AppView) => void;
  user: { email: string; name: string } | null;
  setUser: (u: { email: string; name: string } | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>('landing');
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  const logout = () => {
    setUser(null);
    setView('landing');
  };

  return (
    <AppContext.Provider value={{ view, setView, user, setUser, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
