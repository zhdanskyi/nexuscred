'use client';

import { motion } from 'framer-motion';
import { Shield, Fingerprint, Zap } from 'lucide-react';
import GlassButton from '@/components/ui/GlassButton';
import { useApp } from '@/context/AppContext';

export default function Hero() {
  const { setView } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex items-center justify-center px-6"
    >
      <div className="max-w-2xl text-center">
        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-12 inline-flex items-center gap-3 bg-black/40 backdrop-blur-2xl border border-white/5 px-5 py-2.5 rounded-full"
        >
          <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
          <span className="text-[11px] text-white/25 uppercase tracking-widest">Sistema Activo</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-8xl font-extralight text-white tracking-tighter leading-none mb-6"
        >
          Nexus<span className="text-white/20">Cred</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-base md:text-lg font-light text-white/25 max-w-md mx-auto mb-12 leading-relaxed"
        >
          Reputación laboral descentralizada.
          <br />
          Credenciales criptográficas verificables.
        </motion.p>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-3 mb-16"
        >
          {[
            { icon: Shield, label: 'SHA-256' },
            { icon: Fingerprint, label: 'Zero-Knowledge' },
            { icon: Zap, label: 'Real-time' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 bg-black/40 backdrop-blur-2xl border border-white/5 px-4 py-2.5 rounded-full"
            >
              <Icon size={13} className="text-white/20" strokeWidth={1.5} />
              <span className="text-[12px] font-light text-white/30">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="space-y-4"
        >
          <GlassButton
            id="hero-empezar-button"
            variant="primary"
            size="lg"
            onClick={() => setView('auth')}
            className="mx-auto"
          >
            EMPEZAR
          </GlassButton>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="text-[11px] text-white/10 font-light"
          >
            Sin tarjeta de crédito · Acceso inmediato
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
