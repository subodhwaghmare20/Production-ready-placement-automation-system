import crypto from 'crypto';
import { env } from '../config/env';

// Derive 32-byte key using SHA-256 from env.ENCRYPTION_KEY or fallback
const getKey = (customKey?: string): Buffer => {
  const secret = customKey || (env as any).ENCRYPTION_KEY || 'placement_secure_aes256_enc_key_32bytes!!';
  return crypto.createHash('sha256').update(secret).digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: ivHex:authTagHex:encryptedHex
 */
export const encrypt = (text: string, customKey?: string): string => {
  if (!text) return '';
  const key = getKey(customKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects input format: ivHex:authTagHex:encryptedHex
 */
export const decrypt = (ciphertext: string, customKey?: string): string => {
  if (!ciphertext) return '';
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // If not encrypted format, return as-is (e.g., legacy or mock)
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getKey(customKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Safely masks a sensitive secret for API responses / UI display.
 * Example: 'EAABw...' -> '••••••••b2A9'
 */
export const maskSecret = (secret?: string, visibleChars = 4): string => {
  if (!secret) return '';
  if (secret.startsWith('••••')) return secret; // Already masked
  if (secret.length <= visibleChars) return '••••••••';
  const last = secret.slice(-visibleChars);
  return `••••••••${last}`;
};

/**
 * Validates Meta Webhook HMAC-SHA256 signature using timingSafeEqual.
 * Header format: sha256=<signature_hex>
 */
export const verifyMetaSignature = (
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  appSecret: string
): boolean => {
  if (!rawBody || !signatureHeader || !appSecret) {
    return false;
  }

  try {
    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') {
      return false;
    }

    const providedSignature = parts[1];
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(providedSignature, 'utf8');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
};
