'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, MessageSquare, Shield, Activity, LogOut, Menu, X } from 'lucide-react';
import GlassButton from '@/components/ui/GlassButton';
import CryptoVault from '@/components/crypto/CryptoVault';
import TelegramView from '@/components/chat/TelegramView';
import AuditStream from '@/components/dashboard/AuditStream';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

export type DashboardTab = 'credentials' | 'chat' | 'audit';

const tabs = [
  { id: 'credentials' as DashboardTab, label: 'CryptoVault', icon: Shield },
  { id: 'chat' as DashboardTab, label: 'Mensajes', icon: MessageSquare },
  { id: 'audit' as DashboardTab, label: 'Auditoría', icon: Activity },
];

export default function Dashboard() {
  const { logout, user } = useApp();
  const [activeTab, setActiveTab] = useState<DashboardTab>('credentials');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const res = await fetch('/api/messages', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const unread = data.filter((m: any) => m.recipient_id === session.user.id && !m.is_read).length;
          setUnreadCount(unread);
        }
      } catch (err) {}
    };
    fetchUnread();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.06, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-screen bg-black"
    >
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className={`${mobileMenu ? 'flex' : 'hidden'} lg:flex flex-col w-64 h-full bg-black/40 backdrop-blur-2xl border-r border-white/5 fixed lg:relative z-40`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.03]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-black/50 backdrop-blur-xl border border-white/5 flex items-center justify-center">
                <LayoutDashboard size={13} className="text-white/35" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-light text-white/60 tracking-tight">NexusCred</h2>
                <p className="text-[9px] text-white/15 font-mono">Dashboard</p>
              </div>
            </div>
            <button onClick={() => setMobileMenu(false)} className="lg:hidden text-white/20">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* User */}
        <div className="px-5 py-4 border-b border-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black/50 border border-white/5 flex items-center justify-center text-[10px] text-white/25 font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'D'}
            </div>
            <div>
              <p className="text-xs text-white/40 font-light">{user?.name || 'Demo'}</p>
              <p className="text-[9px] text-white/15 truncate">{user?.email || 'demo@nexuscred.io'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setActiveTab(id); setMobileMenu(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-light transition-all duration-300 ${
                activeTab === id
                  ? 'bg-black/50 backdrop-blur-2xl border border-white/8 text-white/65'
                  : 'text-white/20 hover:text-white/35 hover:bg-white/[0.02]'
              }`}
            >
              <Icon size={15} strokeWidth={1.5} />
              <span>{label}</span>
              {id === 'chat' && unreadCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] text-white/25">{unreadCount}</span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/[0.03]">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-light text-white/15 hover:text-white/30 hover:bg-white/[0.02] transition-all"
          >
            <LogOut size={15} strokeWidth={1.5} />
            <span>Cerrar sesión</span>
          </motion.button>
        </div>
      </aside>

      {/* ── Mobile Overlay ──────────────────────────── */}
      {mobileMenu && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileMenu(false)} />
      )}

      {/* ── Main Content ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-5 border-b border-white/[0.03]">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenu(true)} className="lg:hidden text-white/20 hover:text-white/40">
              <Menu size={18} />
            </button>
            <h1 className="text-base font-light text-white/50 tracking-tight">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
            <span className="text-[10px] text-white/15 font-mono">En línea</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeTab === 'credentials' && <CryptoVault />}
          {activeTab === 'chat' && <TelegramView />}
          {activeTab === 'audit' && <AuditStream />}
        </main>
      </div>
    </motion.div>
  );
}
