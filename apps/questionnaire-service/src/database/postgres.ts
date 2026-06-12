import { Pool, type PoolConfig } from 'pg';

function databaseSslConfig(): PoolConfig['ssl'] {
  const enabled = (process.env.RDS_SSL ?? 'false').toLowerCase();
  if (!['true', '1', 'require'].includes(enabled)) {
    return false;
  }
  return {
    rejectUnauthorized: (process.env.RDS_SSL_REJECT_UNAUTHORIZED ?? 'false').toLowerCase() === 'true',
  };
}

function databaseConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  const ssl = databaseSslConfig();

  console.log('DATABASE_URL=', process.env.DATABASE_URL);
  console.log('RDS_SSL=', process.env.RDS_SSL);
  console.log('SSL_CONFIG=', ssl);

  if (connectionString) {
    return { connectionString, ssl };
  }

  return {
    host: process.env.RDS_HOST,
    port: Number(process.env.RDS_PORT ?? 5432),
    database: process.env.RDS_DB_NAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    ssl,
  };
}



export const pool = new Pool(databaseConfig());
