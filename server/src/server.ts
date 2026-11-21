import createApp from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { seedInitialAdmin } from './config/seedAdmin';
import { permissionService } from './services/permission.service';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // Attempt database connection
    const dbConn = await connectDatabase();

    // If connected to MongoDB, seed initial system roles & admin
    if (dbConn) {
      await permissionService.seedDefaultRoles();
      await seedInitialAdmin();
    } else if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
      logger.error('CRITICAL: Database connection failed in production/staging environment. Terminating process.');
      process.exit(1);
    }

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.success(`================================================`);
      logger.success(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.success(`🔗 Health check available at: http://localhost:${env.PORT}/api/health`);
      logger.success(`🔐 Auth endpoints available under: http://localhost:${env.PORT}/api/auth`);
      logger.success(`================================================`);
    });

    const shutdown = async () => {
      logger.info('Shutting down server gracefully...');
      await disconnectDatabase();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
