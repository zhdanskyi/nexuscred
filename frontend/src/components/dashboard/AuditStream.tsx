'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Eye, CheckCircle2, Share2, XCircle, Plus, Hash } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

interface AuditEntry {
  id: string;
  action: 'created' | 'viewed' | 'verified' | 'revoked' | 'shared';
  credentialTitle: string;
  actor: string;
  timestamp: string;
  hash: string;
}

const actionConfig = {
  created: { icon: Plus, color: 'text-emerald-400/50', label: 'Creada' },
  viewed: { icon: Eye, color: 'text-white/25', label: 'Visualizada' },
  verified: { icon: CheckCircle2, color: 'text-emerald-400/50', label: 'Verificada' },
  revoked: { icon: XCircle, color: 'text-red-400/50', label: 'Revocada' },
  shared: { icon: Share2, color: 'text-amber-400/50', label: 'Compartida' },
};

const actors = ['Elena Rodríguez', 'Marco Vidal', 'Ana Torres', 'Luis Méndez', 'Sara Kim', 'Sistema'];
const creds = ['Blockchain Developer', 'Smart Contract Auditor', 'DeFi Architect', 'Zero-Knowledge Eng.', 'Full Stack Dev'];
const actions: AuditEntry['action'][] = ['created', 'viewed', 'verified', 'shared', 'revoked'];

function randomEntry(): AuditEntry {
  return {
    id: String(Date.now() + Math.random()),
    action: actions[Math.floor(Math.random() * actions.length)],
    credentialTitle: creds[Math.floor(Math.random() * creds.length)],
    actor: actors[Math.floor(Math.random() * actors.length)],
    timestamp: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    hash: Math.random().toString(36).substring(2, 14),
  };
}

export default function AuditStream() {
  const [entries, setEntries] = useState<AuditEntry[]>(() => Array.from({ length: 8 }, randomEntry));

  useEffect(() => {
    const interval = setInterval(() => {
      setEntries((prev) => [randomEntry(), ...prev].slice(0, 50));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard variant="elevated" hover={false} className="p-5 flex items-center justify-between shadow-[0_0_20px_rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-3">
          <Activity size={15} className="text-white/80" />
          <div>
            <h3 className="text-sm font-medium text-slate-100">Stream de Auditoría</h3>
            <p className="text-[10px] text-white/70">Registro inmutable en tiempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="text-[10px] text-emerald-100/80 font-mono">LIVE</span>
        </div>
      </GlassCard>

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const config = actionConfig[entry.action];
          const Icon = config.icon;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassCard className="p-4 flex items-center gap-4 !rounded-xl border-white/20" glow>
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
                  <Icon size={12} className={config.color} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] uppercase tracking-wider font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-[10px] text-white/40">·</span>
                    <span className="text-[10px] text-white/60 font-mono">{entry.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-100 font-light truncate">
                    <span className="text-white font-medium">{entry.actor}</span> — {entry.credentialTitle}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-white/40 shrink-0">
                  <Hash size={8} />
                  <span className="text-[9px] font-mono">{entry.hash}</span>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
