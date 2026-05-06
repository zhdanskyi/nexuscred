'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Cpu, Hash, CheckCircle2, Plus } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from '@/components/ui/GlassButton';
import { useHasher } from '@/components/crypto/Hasher';
import { supabase } from '@/lib/supabase';

interface VaultCredential {
  id: string;
  title: string;
  worker: string;
  hash: string;
  timestamp: string;
}

export default function CryptoVault() {
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCredentials = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/credentials', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          worker: item.profiles?.full_name || item.metadata?.worker_name_fallback || 'Unknown',
          hash: item.proof_hash,
          timestamp: item.created_at
        }));
        setCredentials(mapped);
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

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
    const saveCredential = async () => {
      if (hash && !isHashing && !isRevealing && formData.title) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('/api/credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({
              title: formData.title,
              description: formData.description,
              worker_name: formData.worker,
              proof_hash: hash,
              metadata: { worker_name_fallback: formData.worker }
            })
          });

          if (res.ok) {
            await fetchCredentials(); // Refresh list
          }
        } catch (error) {
          console.error('Error saving credential:', error);
        }

        setTimeout(() => {
          setFormData({ title: '', worker: '', description: '' });
          setShowForm(false);
          reset();
          setRevealedHash('');
        }, 3000);
      }
    };

    saveCredential();
  }, [hash, isHashing, isRevealing, formData.title, formData.worker, formData.description, reset]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-inner">
            <Shield size={16} className="text-white/60" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">CryptoVault</h2>
            <p className="text-[11px] text-zinc-400">Credenciales con prueba criptográfica</p>
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
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-widest mb-2 font-medium">Título</label>
                  <input
                    type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Full Stack Developer"
                    className="w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20 transition-colors shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-widest mb-2 font-medium">Trabajador</label>
                  <input
                    type="text" value={formData.worker} onChange={(e) => setFormData({ ...formData, worker: e.target.value })}
                    placeholder="Nombre del receptor"
                    className="w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20 transition-colors shadow-inner"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-widest mb-2 font-medium">Descripción</label>
                <textarea
                  value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la credencial..."
                  rows={2}
                  className="w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20 transition-colors resize-none shadow-inner"
                />
              </div>

              {/* Mining Section */}
              {(isHashing || hash) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-black/60 rounded-xl border border-white/5 p-5 space-y-3 shadow-inner"
                >
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className={isHashing ? 'text-amber-400/50 animate-pulse' : 'text-emerald-400/50'} />
                    <span className="text-xs text-zinc-400 font-mono tracking-wider font-medium">
                      {isHashing ? 'Mining Proof...' : '✓ Proof Generated'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {isHashing && (
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500/50 to-amber-300"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}

                  {/* Hash Typewriter Reveal */}
                  {(revealedHash || isRevealing) && (
                    <div className="flex items-start gap-2">
                      <Hash size={12} className="text-white/20 mt-1 shrink-0" />
                      <p className="font-mono text-xs text-white/60 break-all leading-relaxed">
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
                  <h3 className="text-sm font-medium text-white">{cred.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{cred.worker}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                  <CheckCircle2 size={10} className="text-emerald-400/70" />
                  <span className="text-[10px] text-emerald-100/70 font-medium">Verificada</span>
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-3 border border-white/5 shadow-inner">
                <div className="flex items-center gap-2 mb-1">
                  <Hash size={10} className="text-white/20" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">SHA-256 Proof</span>
                </div>
                <p className="font-mono text-[11px] text-white/50 break-all leading-relaxed">{cred.hash}</p>
              </div>
              <p className="text-[10px] text-zinc-600 font-mono">
                {new Date(cred.timestamp).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
