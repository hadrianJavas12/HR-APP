import http from 'http';
import { createApp } from './app.js';
import config from './config/index.js';
import { initDatabase, closeDatabase } from './config/database.js';
import { initRedis, closeRedis } from './config/redis.js';
import { initSocketIO } from './socket/index.js';
import { initWorkers, scheduleRecurringJobs } from './jobs/index.js';
import logger from './utils/logger.js';

/**
 * Wait for the database to be ready and run migrations.
 * Retries up to maxRetries times with exponential backoff.
 */
async function waitForDatabase(db, maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test raw connection first
      await db.raw('SELECT 1');
      logger.info(`Database connection verified (attempt ${attempt})`);

      // Run migrations
      const [batchNo, migrationList] = await db.migrate.latest();
      if (migrationList.length > 0) {
        logger.info({ batch: batchNo, migrations: migrationList }, 'Database migrations completed');
      } else {
        logger.info('Database already up to date');
      }
      return;
    } catch (err) {
      const delay = Math.min(attempt * 2000, 15000);
      logger.warn(
        { err: err.message, attempt, maxRetries, retryInMs: delay },
        `Database not ready, retrying in ${delay / 1000}s...`,
      );
      if (attempt === maxRetries) {
        throw new Error(`Database failed after ${maxRetries} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function start() {
  logger.info('='.repeat(60));
  logger.info(`Starting ${config.appName} [${config.env}]`);
  logger.info(`Node.js ${process.version} | PID ${process.pid}`);
  logger.info(`Working directory: ${process.cwd()}`);
  logger.info('='.repeat(60));

  try {
    // ── Step 1: Database ─────────────────────────
    logger.info('Initializing database...');
    const db = initDatabase();

    await waitForDatabase(db);

    // ── Step 2: Redis ────────────────────────────
    logger.info('Initializing Redis...');
    initRedis();

    // ── Step 3: Express app ──────────────────────
    logger.info('Creating Express app...');
    const app = createApp();
    const server = http.createServer(app);

    // ── Step 4: Socket.IO ────────────────────────
    logger.info('Initializing Socket.IO...');
    initSocketIO(server);

    // ── Step 5: Background workers (non-fatal) ──
    logger.info('Initializing background workers...');
    try {
      initWorkers();
      await scheduleRecurringJobs();
    } catch (workerErr) {
      logger.warn({ err: workerErr.message }, 'Background workers failed to initialize (non-fatal)');
    }

    // ── Step 6: Start listening ──────────────────
    server.listen(config.port, '0.0.0.0', () => {
      logger.info('='.repeat(60));
      logger.info(`🚀 ${config.appName} running on port ${config.port} [${config.env}]`);
      logger.info(`📖 Health: ${config.appUrl}/api/v1/health`);
      logger.info('='.repeat(60));
    });

    // ── Graceful shutdown ────────────────────────
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
    logger.error('='.repeat(60));
    logger.error({ err: error, stack: error?.stack }, 'FATAL: Failed to start server');
    logger.error('='.repeat(60));
    process.exit(1);
  }
}

start();
