import CryptoJS from 'crypto-js';

/**
 * Genera un hash SHA-256 a partir de los datos de una credencial.
 * Simula un "proof" criptográfico para el sistema de reputación.
 */
export function generateCredentialHash(data: {
  issuer: string;
  worker: string;
  title: string;
  description?: string;
  timestamp?: string;
}): string {
  const payload = JSON.stringify({
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
    nonce: Math.random().toString(36).substring(2),
  });

  return CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);
}

/**
 * Verifica si un hash dado es un SHA-256 válido (64 caracteres hex).
 */
export function isValidHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}
