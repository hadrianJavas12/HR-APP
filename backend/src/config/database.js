import knex from 'knex';
import { Model } from 'objection';
import knexConfig from './knexfile.js';
import logger from '../utils/logger.js';

/** @type {import('knex').Knex} */
let db;

/**
 * Initialize the database connection and bind Objection.js.
 * @returns {import('knex').Knex}
 */
export function initDatabase() {
  db = knex(knexConfig);

  // Bind all Objection.js models to this knex instance
  Model.knex(db);

  logger.info('Database connection pool initialized');
  return db;
}

/**
 * Get the current knex instance.
 * @returns {import('knex').Knex}
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Gracefully close the pool.
 */
export async function closeDatabase() {
  if (db) {
    await db.destroy();
    logger.info('Database connection pool closed');
  }
}

export default { initDatabase, getDb, closeDatabase };
