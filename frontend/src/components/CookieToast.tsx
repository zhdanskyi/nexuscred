'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie } from 'lucide-react';

export default function CookieToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('nexuscred-cookies');
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('nexuscred-cookies', 'true');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="cookie-toast"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className="glass-elevated rounded-2xl p-5 flex items-start gap-4">
            <Cookie size={18} className="text-white/30 mt-0.5 shrink-0" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-sm text-white/50 font-light leading-relaxed">
                Utilizamos cookies esenciales para el funcionamiento del sistema.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={accept}
                  className="glass-button-primary px-4 py-1.5 rounded-lg text-xs"
                >
                  Aceptar
                </button>
                <button
                  onClick={accept}
                  className="text-xs text-white/20 hover:text-white/40 transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
            <button
              onClick={accept}
              className="text-white/15 hover:text-white/30 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
