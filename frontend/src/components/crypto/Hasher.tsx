'use client';

import { useState, useCallback } from 'react';
import { generateCredentialHash } from '@/lib/hash';

interface HasherResult {
  hash: string;
  isHashing: boolean;
  progress: number;
}

/**
 * Hook que encapsula la lógica de generación de hash SHA-256.
 * Simula un proceso de "mining" con progreso visual.
 */
export function useHasher() {
  const [result, setResult] = useState<HasherResult>({
    hash: '',
    isHashing: false,
    progress: 0,
  });

  const generateHash = useCallback(
    (data: { issuer: string; worker: string; title: string; description?: string }) => {
      setResult({ hash: '', isHashing: true, progress: 0 });

      // Simular proceso de mining con intervalos
      const totalSteps = 20;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        setResult((prev) => ({
          ...prev,
          progress: Math.min((step / totalSteps) * 100, 95),
        }));

        if (step >= totalSteps) {
          clearInterval(interval);
          const hash = generateCredentialHash(data);
          setResult({ hash, isHashing: false, progress: 100 });
        }
      }, 120);

      return () => clearInterval(interval);
    },
    []
  );

  const reset = useCallback(() => {
    setResult({ hash: '', isHashing: false, progress: 0 });
  }, []);

  return { ...result, generateHash, reset };
}
