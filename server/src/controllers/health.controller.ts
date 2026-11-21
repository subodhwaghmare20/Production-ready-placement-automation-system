import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';

/**
 * Health Check Controller
 * GET /api/health
 * Production-ready liveness & readiness check
 */
export const getHealth = (_req: Request, res: Response): void => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? 'healthy' : 'degraded';
  const httpStatus = isDbConnected ? 200 : 503;

  res.status(httpStatus).json({
    success: isDbConnected,
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: isDbConnected ? 'connected' : 'disconnected',
      host: isDbConnected ? mongoose.connection.host : null,
    },
    environment: env.NODE_ENV,
    version: '1.0.0',
  });
};
