import config from './index.js';

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
      directory: '../database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: '../database/seeds',
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
      ssl: { rejectUnauthorized: false },
    },
    pool: config.db.pool,
    migrations: {
      directory: '../database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: '../database/seeds',
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
      directory: '../database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: '../database/seeds',
    },
  },
};

export default knexConfig[config.env] || knexConfig.development;
