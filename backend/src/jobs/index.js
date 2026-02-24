import { Queue, Worker } from 'bullmq';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { refreshMaterializedViews } from '../services/dashboard.service.js';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

// ── Queues ─────────────────────────────────────

export const reportQueue = new Queue('report-generation', { connection });
export const alertQueue = new Queue('alert-processing', { connection });
export const viewRefreshQueue = new Queue('view-refresh', { connection });

// ── Workers ────────────────────────────────────

/**
 * Initialize background job workers.
 */
export function initWorkers() {
  // Report generation worker
  const reportWorker = new Worker(
    'report-generation',
    async (job) => {
      logger.info({ jobId: job.id, type: job.name }, 'Processing report job');

      switch (job.name) {
        case 'utilization-report':
          // TODO: Implement full report generation (CSV/XLSX/PDF)
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
          // TODO: Send email via nodemailer
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
}

/**
 * Schedule recurring jobs.
 */
export async function scheduleRecurringJobs() {
  // Refresh materialized views every hour
  await viewRefreshQueue.add('refresh-views', {}, {
    repeat: { every: 60 * 60 * 1000 }, // Every hour
    removeOnComplete: 10,
    removeOnFail: 50,
  });

  // Check for overloaded employees daily at 9 AM
  await alertQueue.add('overload-check', {}, {
    repeat: { pattern: '0 9 * * *' },
    removeOnComplete: 10,
    removeOnFail: 50,
  });

  logger.info('Recurring jobs scheduled');
}
