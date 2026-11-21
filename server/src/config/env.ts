import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_automation',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'placement_auto_jwt_super_secret_key_2026_secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'placement_auto_cookie_secret_key_2026',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Placement Officer',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@placement.edu',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@12345',
  
  // Module 10: WhatsApp Business Cloud API & Webhooks
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'placement_secure_aes256_enc_key_32bytes!!',
  META_APP_ID: process.env.META_APP_ID || '',
  META_APP_SECRET: process.env.META_APP_SECRET || '',
  META_WABA_ID: process.env.META_WABA_ID || '',
  META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID || '',
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN || '',
  META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN || 'placement_auto_webhook_verify_token_2026',
  META_GRAPH_VERSION: process.env.META_GRAPH_VERSION || 'v21.0',
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || 'http://localhost:5000',
};
