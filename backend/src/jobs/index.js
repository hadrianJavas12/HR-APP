import { Queue, Worker } from 'bullmq';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { refreshMaterializedViews } from '../services/dashboard.service.js';

function getConnection() {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
  };
}

// ── Queues (lazy-initialized) ──────────────────
let reportQueue;
let alertQueue;
let viewRefreshQueue;

function ensureQueues() {
  const connection = getConnection();
  if (!reportQueue) reportQueue = new Queue('report-generation', { connection });
  if (!alertQueue) alertQueue = new Queue('alert-processing', { connection });
  if (!viewRefreshQueue) viewRefreshQueue = new Queue('view-refresh', { connection });
  return { reportQueue, alertQueue, viewRefreshQueue };
}

export { reportQueue, alertQueue, viewRefreshQueue };

// ── Workers ────────────────────────────────────

/**
 * Initialize background job workers.
 * Non-fatal: if Redis is unavailable, workers will retry automatically.
 */
export function initWorkers() {
  try {
    const connection = getConnection();

    // Report generation worker
    const reportWorker = new Worker(
      'report-generation',
      async (job) => {
        logger.info({ jobId: job.id, type: job.name }, 'Processing report job');

        switch (job.name) {
          case 'utilization-report':
            logger.info({ data: job.data }, 'Generating utilization report');
            break;
          case 'cost-report':
            logger.info({ data: job.data }, 'Generating cost report');
            break;
          default:
            logger.warn({ jobName: job.name }, 'Unknown report job type');
        }
      },
      { connection, concurrency: 2 },
    );

    // Alert processing worker
    const alertWorker = new Worker(
      'alert-processing',
      async (job) => {
        logger.info({ jobId: job.id, type: job.name }, 'Processing alert job');

        switch (job.name) {
          case 'overload-check':
            logger.info('Checking for overloaded employees');
            break;
          case 'underutil-check':
            logger.info('Checking for underutilized employees');
            break;
          case 'email-notification':
            logger.info({ to: job.data.to, subject: job.data.subject }, 'Sending email');
            break;
          default:
            logger.warn({ jobName: job.name }, 'Unknown alert job type');
        }
      },
      { connection, concurrency: 3 },
    );

    // Materialized view refresh worker
    const viewWorker = new Worker(
      'view-refresh',
      async (job) => {
        logger.info('Refreshing materialized views');
        try {
          await refreshMaterializedViews();
          logger.info('Materialized views refreshed successfully');
        } catch (err) {
          logger.error({ err }, 'Failed to refresh materialized views');
          throw err;
        }
      },
      { connection, concurrency: 1 },
    );

    // Error handlers
    [reportWorker, alertWorker, viewWorker].forEach((worker) => {
      worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err: err.message }, 'Job failed');
      });
      worker.on('completed', (job) => {
        logger.info({ jobId: job.id }, 'Job completed');
      });
    });

    logger.info('Background workers initialized');
    return { reportWorker, alertWorker, viewWorker };
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to initialize workers (non-fatal, will retry on next restart)');
    return null;
  }
}

/**
 * Schedule recurring jobs.
 * Non-fatal: if Redis is unavailable, jobs will be scheduled later.
 */
export async function scheduleRecurringJobs() {
  try {
    const { viewRefreshQueue: vrq, alertQueue: aq } = ensureQueues();

    // Refresh materialized views every hour
    await vrq.add('refresh-views', {}, {
      repeat: { every: 60 * 60 * 1000 }, // Every hour
      removeOnComplete: 10,
      removeOnFail: 50,
    });

    // Check for overloaded employees daily at 9 AM
    await aq.add('overload-check', {}, {
      repeat: { pattern: '0 9 * * *' },
      removeOnComplete: 10,
      removeOnFail: 50,
    });

    logger.info('Recurring jobs scheduled');
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to schedule recurring jobs (non-fatal, Redis may be unavailable)');
  }
}
