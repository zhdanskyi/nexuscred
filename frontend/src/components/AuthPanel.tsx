'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from '@/components/ui/GlassButton';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function AuthPanel() {
  const { setView, setUser } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      setUser({ email, name: email.split('@')[0] });
      setView('dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de autenticación';
      setError(msg);
      // Demo fallback: proceed even without Supabase configured
      if (msg.includes('fetch') || msg.includes('URL') || msg.includes('supabase') || msg.includes('placeholder')) {
        setTimeout(() => {
          setUser({ email: email || 'demo@nexuscred.io', name: email ? email.split('@')[0] : 'Demo' });
          setView('dashboard');
        }, 600);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    setLoading(true);
    setTimeout(() => {
      setUser({ email: 'demo@nexuscred.io', name: 'Demo User' });
      setView('dashboard');
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex items-center justify-end px-6 lg:px-16"
    >
      <div className="w-full max-w-md" style={{ perspective: '1200px' }}>
        <motion.div
          initial={{ rotateY: -4 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard variant="elevated" hover={false} className="p-8 rounded-3xl relative">
            {/* Depth layers */}
            <div className="absolute -inset-1 rounded-3xl bg-white/[0.015] -z-10 blur-sm" />
            <div className="absolute -inset-3 rounded-3xl bg-white/[0.008] -z-20 blur-md" />

            {/* Back button */}
            <button
              onClick={() => setView('landing')}
              className="text-[11px] text-white/15 hover:text-white/30 transition-colors mb-6 flex items-center gap-1"
            >
              ← Volver
            </button>

            {/* Header */}
            <h2 className="text-2xl md:text-3xl font-extralight text-white/80 mb-2 tracking-tight">
              {isLogin ? 'Acceder' : 'Crear cuenta'}
            </h2>
            <p className="text-sm text-white/20 font-light mb-8">
              {isLogin ? 'Ingresa al ecosistema de credenciales' : 'Únete a la red de reputación'}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-[10px] text-white/15 uppercase tracking-widest mb-2">
                  Correo electrónico
                </label>
                <input
                  id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-black/40 backdrop-blur-2xl border border-white/5 rounded-xl px-5 py-3.5 text-sm text-white/70 placeholder-white/10 outline-none focus:border-white/15 transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-[10px] text-white/15 uppercase tracking-widest mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="auth-password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full bg-black/40 backdrop-blur-2xl border border-white/5 rounded-xl px-5 py-3.5 pr-12 text-sm text-white/70 placeholder-white/10 outline-none focus:border-white/15 transition-colors"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/30 transition-colors">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[11px] text-red-400/50 font-light">{error}</motion.p>
              )}

              <GlassButton type="submit" variant="primary" loading={loading}
                disabled={loading} className="w-full mt-2">
                <span>{isLogin ? 'Iniciar sesión' : 'Registrarse'}</span>
                <ArrowRight size={14} />
              </GlassButton>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[10px] text-white/10">o</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>

            {/* Demo */}
            <GlassButton id="demo-button" onClick={handleDemo} className="w-full">
              Acceso Demo
            </GlassButton>

            {/* Toggle */}
            <p className="text-center text-[11px] text-white/15 mt-6 font-light">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button type="button" onClick={() => setIsLogin(!isLogin)}
                className="text-white/30 hover:text-white/50 transition-colors underline underline-offset-2">
                {isLogin ? 'Crear una' : 'Iniciar sesión'}
              </button>
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
