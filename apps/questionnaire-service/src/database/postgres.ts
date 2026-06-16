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
  const connectionString = kubernetesSafeDatabaseUrl();
  const ssl = databaseSslConfig();

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

function kubernetesSafeDatabaseUrl(): string | undefined {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || !process.env.KUBERNETES_SERVICE_HOST) {
    return connectionString;
  }

  try {
    const host = new URL(connectionString).hostname.toLowerCase();
    if (['localhost', '127.0.0.1', 'host.docker.internal'].includes(host)) {
      console.warn('Ignoring local DATABASE_URL inside Kubernetes; using RDS_* settings instead.');
      return undefined;
    }
  } catch {
    return connectionString;
  }

  return connectionString;
}



export const pool = new Pool(databaseConfig());
