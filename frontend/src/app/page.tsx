'use client';

import { AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from '@/context/AppContext';
import Hero from '@/components/Hero';
import AuthPanel from '@/components/AuthPanel';
import Dashboard from '@/components/Dashboard';
import CookieToast from '@/components/CookieToast';

function AppContent() {
  const { view } = useApp();

  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Ambient background glow — no blue, pure white */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.012] blur-[100px]" />
        <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-black to-transparent" />
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' && <Hero key="landing" />}
        {view === 'auth' && <AuthPanel key="auth" />}
        {view === 'dashboard' && <Dashboard key="dashboard" />}
      </AnimatePresence>

      <CookieToast />

      {/* Footer — landing only */}
      {view === 'landing' && (
        <footer className="fixed bottom-0 left-0 right-0 z-10 px-8 py-4 flex items-center justify-between text-[10px] text-white/10 pointer-events-none">
          <span>© 2026 NexusCred</span>
          <span className="font-mono tracking-wider">v1.0.0-alpha</span>
        </footer>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
