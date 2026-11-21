import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let memoryServer: any = null;

export const connectDatabase = async (): Promise<typeof mongoose | null> => {
  // First attempt: Connect to configured MONGODB_URI
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    logger.info(`MongoDB Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const err = error as Error;
    logger.warn(`Primary MongoDB connection at ${env.MONGODB_URI} unavailable: ${err.message}`);

    // If in development mode, fallback to in-memory MongoDB
    if (env.NODE_ENV === 'development') {
      try {
        logger.info('Initializing fallback In-Memory MongoDB Server for development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();
        
        const conn = await mongoose.connect(memoryUri);
        logger.success(`In-Memory MongoDB Connected at: ${memoryUri}`);
        logger.info('Note: To connect to your persistent MongoDB instance, start MongoDB and update MONGODB_URI in server/.env');
        return conn;
      } catch (memErr) {
        logger.error('Failed to initialize fallback in-memory MongoDB:', memErr);
      }
    }

    logger.warn('Please ensure MongoDB is running or specify a valid MONGODB_URI in .env');
    return null;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});
