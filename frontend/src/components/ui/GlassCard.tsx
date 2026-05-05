'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import { type ReactNode } from 'react';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

const variants = {
  default: 'bg-black/40 backdrop-blur-2xl border border-white/5',
  elevated: 'bg-black/50 backdrop-blur-3xl border border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]',
  subtle: 'bg-white/[0.02] backdrop-blur-xl border border-white/[0.03]',
};

export default function GlassCard({
  children,
  variant = 'default',
  className,
  hover = true,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.005, borderColor: 'rgba(255,255,255,0.1)' } : undefined}
      whileTap={hover ? { scale: 0.995 } : undefined}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        'rounded-2xl transition-all duration-300',
        variants[variant],
        glow && 'hover:shadow-[0_0_40px_rgba(255,255,255,0.04)]',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
