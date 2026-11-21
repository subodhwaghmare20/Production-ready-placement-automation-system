import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { csrfProtection } from './middleware/csrf.middleware';

const createApp = (): Application => {
  const app = express();

  // Dynamic CORS configuration supporting credentials for cookies
  const configuredOrigins = env.CLIENT_URL
    ? env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, ''))
    : [];

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!requestOrigin) {
          return callback(null, true);
        }

        const normalizedOrigin = requestOrigin.replace(/\/$/, '');

        // Allow if wildcard configured, origin explicitly configured, ends in .vercel.app, or localhost
        if (
          configuredOrigins.includes('*') ||
          configuredOrigins.includes(normalizedOrigin) ||
          normalizedOrigin.endsWith('.vercel.app') ||
          normalizedOrigin.includes('localhost') ||
          normalizedOrigin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-csrf-token'],
    })
  );

  // Core Parsers with rawBody retention for webhook signature verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // CSRF Protection
  app.use(csrfProtection);

  // Mount API Routes (supporting both /api and /api/v1)
  app.use('/api', apiRoutes);
  app.use('/api/v1', apiRoutes);

  // 404 Route Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
