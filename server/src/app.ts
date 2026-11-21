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

  // CORS configuration supporting credentials for cookies
  const configuredOrigins = env.CLIENT_URL
    ? env.CLIENT_URL.split(',').map((u) => u.trim())
    : [];
  const allowedOrigins = [
    ...configuredOrigins,
    ...(env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
  ].filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
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
