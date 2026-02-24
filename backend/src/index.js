import http from 'http';
import { createApp } from './app.js';
import config from './config/index.js';
import { initDatabase, closeDatabase } from './config/database.js';
import { initRedis, closeRedis } from './config/redis.js';
import { initSocketIO } from './socket/index.js';
import { initWorkers, scheduleRecurringJobs } from './jobs/index.js';
import logger from './utils/logger.js';

async function start() {
  try {
    // Initialize database
    initDatabase();
    logger.info('Database initialized');

    // Initialize Redis
    initRedis();
    logger.info('Redis initialized');

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocketIO(server);

    // Initialize background workers
    initWorkers();
    await scheduleRecurringJobs();

    // Start listening
    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`🚀 ${config.appName} running on port ${config.port} [${config.env}]`);
      logger.info(`📖 API docs: ${config.appUrl}/api/v1/health`);
    });

    // ── Graceful shutdown ──────────────────────
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        await closeDatabase();
        await closeRedis();

        logger.info('All connections closed. Process exiting.');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled Rejection');
    });

    process.on('uncaughtException', (error) => {
      logger.error({ error }, 'Uncaught Exception');
      process.exit(1);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

start();
