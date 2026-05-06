'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { type ReactNode, type ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
}

export default function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  loading = false,
  className,
  ...props
}: GlassButtonProps) {
  const base = 'relative overflow-hidden rounded-2xl font-light tracking-wide transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  const variantStyles = {
    default: 'bg-white/20 backdrop-blur-xl border border-white/40 text-slate-100 hover:bg-white/30 hover:border-white/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]',
    primary: 'bg-white text-black border border-white/95 font-medium hover:bg-white/90 hover:shadow-[0_0_50px_rgba(255,255,255,0.4)]',
    ghost: 'bg-transparent border border-transparent text-slate-100/70 hover:text-white hover:bg-white/10',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-10 py-4 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(base, variantStyles[variant], sizeStyles[size], className)}
      disabled={loading || props.disabled}
      {...(props as Record<string, unknown>)}
    >
      {/* Hover glow sweep */}
      <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : children}
      </span>
    </motion.button>
  );
}
