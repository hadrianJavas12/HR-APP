import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../database/migrations');
const seedsDir = join(__dirname, '../database/seeds');

/**
 * Knex configuration for all environments.
 * @type {import('knex').Knex.Config}
 */
const knexConfig = {
  development: {
    client: 'pg',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
    },
    pool: config.db.pool,
    migrations: {
      directory: migrationsDir,
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: seedsDir,
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    },
    pool: config.db.pool,
    migrations: {
      directory: migrationsDir,
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: seedsDir,
    },
  },

  test: {
    client: 'pg',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: `${config.db.database}_test`,
      user: config.db.user,
      password: config.db.password,
    },
    pool: { min: 1, max: 5 },
    migrations: {
      directory: migrationsDir,
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: seedsDir,
    },
  },
};

export default knexConfig[config.env] || knexConfig.development;
