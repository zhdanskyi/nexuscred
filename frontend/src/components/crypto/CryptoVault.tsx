'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Cpu, Hash, CheckCircle2, Plus } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from '@/components/ui/GlassButton';
import { useHasher } from '@/components/crypto/Hasher';

interface VaultCredential {
  id: string;
  title: string;
  worker: string;
  hash: string;
  timestamp: string;
}

export default function CryptoVault() {
  const [credentials, setCredentials] = useState<VaultCredential[]>([
    { id: '1', title: 'Blockchain Developer', worker: 'Elena Rodríguez', hash: 'a7f3c9e2d1b406f8e3a29d7c5b1e8f4a2d6c9b3e7f1a5d8c2b6e9f3a7d1c5b8', timestamp: '2026-04-28T10:30:00Z' },
    { id: '2', title: 'Smart Contract Auditor', worker: 'Marco Vidal', hash: 'b8e4d0f3a2c517e9d4b3ae8c6c2f9a5b3e7d1a6c8f2b5e9a3d7c1f4b8e2a6d9', timestamp: '2026-05-01T14:15:00Z' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', worker: '', description: '' });
  const { hash, isHashing, progress, generateHash, reset } = useHasher();
  const [revealedHash, setRevealedHash] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);

  // Typewriter effect for hash reveal
  useEffect(() => {
    if (hash && !isHashing) {
      setIsRevealing(true);
      setRevealedHash('');
      let i = 0;
      const interval = setInterval(() => {
        if (i < hash.length) {
          setRevealedHash(hash.substring(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setIsRevealing(false);
        }
      }, 25);
      return () => clearInterval(interval);
    }
  }, [hash, isHashing]);

  const handleIssue = () => {
    if (!formData.title || !formData.worker) return;
    generateHash({
      issuer: 'current-user',
      worker: formData.worker,
      title: formData.title,
      description: formData.description,
    });
  };

  // Save credential when hash is complete
  useEffect(() => {
    if (hash && !isHashing && !isRevealing && formData.title) {
      setCredentials((prev) => [
        {
          id: String(Date.now()),
          title: formData.title,
          worker: formData.worker,
          hash,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTimeout(() => {
        setFormData({ title: '', worker: '', description: '' });
        setShowForm(false);
        reset();
        setRevealedHash('');
      }, 3000);
    }
  }, [hash, isHashing, isRevealing, formData.title, formData.worker, reset]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-2xl border border-white/5 flex items-center justify-center">
            <Shield size={16} className="text-white/40" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-light text-white/70">CryptoVault</h2>
            <p className="text-[11px] text-white/20">Credenciales con prueba criptográfica</p>
          </div>
        </div>
        <GlassButton onClick={() => { setShowForm(!showForm); reset(); setRevealedHash(''); }} size="sm">
          <Plus size={14} />
          <span>Emitir</span>
        </GlassButton>
      </div>

      {/* Issue Form + Mining */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard variant="elevated" hover={false} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/20 uppercase tracking-widest mb-2">Título</label>
                  <input
                    type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Full Stack Developer"
                    className="w-full bg-black/40 backdrop-blur-2xl border border-white/5 rounded-xl px-4 py-3 text-sm text-white/70 placeholder-white/15 outline-none focus:border-white/15 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/20 uppercase tracking-widest mb-2">Trabajador</label>
                  <input
                    type="text" value={formData.worker} onChange={(e) => setFormData({ ...formData, worker: e.target.value })}
                    placeholder="Nombre del receptor"
                    className="w-full bg-black/40 backdrop-blur-2xl border border-white/5 rounded-xl px-4 py-3 text-sm text-white/70 placeholder-white/15 outline-none focus:border-white/15 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/20 uppercase tracking-widest mb-2">Descripción</label>
                <textarea
                  value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la credencial..."
                  rows={2}
                  className="w-full bg-black/40 backdrop-blur-2xl border border-white/5 rounded-xl px-4 py-3 text-sm text-white/70 placeholder-white/15 outline-none focus:border-white/15 transition-colors resize-none"
                />
              </div>

              {/* Mining Section */}
              {(isHashing || hash) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-black/60 rounded-xl border border-white/[0.03] p-5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className={isHashing ? 'text-amber-400/50 animate-pulse' : 'text-emerald-400/50'} />
                    <span className="text-xs text-white/30 font-mono tracking-wider">
                      {isHashing ? 'Mining Proof...' : '✓ Proof Generated'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {isHashing && (
                    <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500/30 to-amber-400/60"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}

                  {/* Hash Typewriter Reveal */}
                  {(revealedHash || isRevealing) && (
                    <div className="flex items-start gap-2">
                      <Hash size={12} className="text-white/10 mt-1 shrink-0" />
                      <p className="font-mono text-xs text-[#c0c0c0] break-all leading-relaxed">
                        {revealedHash}
                        {isRevealing && <span className="animate-pulse text-white/40">▋</span>}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              <GlassButton variant="primary" onClick={handleIssue} loading={isHashing} disabled={!formData.title || !formData.worker} className="w-full">
                <Lock size={14} />
                <span>{isHashing ? 'Generando Proof...' : 'Generar Credencial'}</span>
              </GlassButton>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credential Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {credentials.map((cred, i) => (
          <motion.div
            key={cred.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard className="p-5 space-y-3" glow>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-light text-white/60">{cred.title}</h3>
                  <p className="text-xs text-white/25 mt-0.5">{cred.worker}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/5">
                  <CheckCircle2 size={10} className="text-emerald-400/50" />
                  <span className="text-[10px] text-emerald-400/50">Verificada</span>
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-3 border border-white/[0.03]">
                <div className="flex items-center gap-2 mb-1">
                  <Hash size={10} className="text-white/10" />
                  <span className="text-[10px] text-white/15 uppercase tracking-widest">SHA-256 Proof</span>
                </div>
                <p className="font-mono text-[11px] text-[#c0c0c0]/60 break-all leading-relaxed">{cred.hash}</p>
              </div>
              <p className="text-[10px] text-white/10 font-mono">
                {new Date(cred.timestamp).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
