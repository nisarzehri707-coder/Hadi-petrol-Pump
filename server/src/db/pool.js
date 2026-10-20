import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runMigrations } from './migrate.js';
import { createSqlitePool, getSqliteDbPath, getResolvedSqlitePath } from './sqlitePool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let poolInstance = null;
let isRealPg = false;
let isSqlite = false;
let migrationsRan = false;

export function sanitizeConnectionString(connStr) {
  if (!connStr) return 'Not configured';
  try {
    const url = new URL(connStr);
    const host = url.hostname || 'localhost';
    const port = url.port || '5432';
    const dbName = url.pathname ? url.pathname.replace(/^\//, '') : 'default';
    return `${host}:${port}/${dbName}`;
  } catch {
    return connStr.replace(/:([^:@]+)@/, ':****@');
  }
}

export function getSslConfig(connectionString) {
  if (!connectionString) return false;
  if (connectionString.includes('sslmode=disable')) {
    return false;
  }
  const isNeon = connectionString.includes('neon.tech');
  const isSslRequire = connectionString.includes('sslmode=require');
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  if (isNeon || isSslRequire || (isProduction && !isLocalhost)) {
    return { rejectUnauthorized: false };
  }
  return false;
}

/**
 * Initializes an isolated in-memory database using SQLite for unit testing.
 */
export async function createTestPool() {
  const pool = createSqlitePool(':memory:');
  isRealPg = false;
  isSqlite = true;
  poolInstance = pool;

  // Run schema migration once
  await runInitialMigration(pool);

  return poolInstance;
}

/**
 * Gets database pool for the application.
 * In desktop mode (or local development without PG), defaults to persistent SQLite.
 * In cloud / web production, expects DATABASE_URL unless IS_DESKTOP is enabled.
 */
export async function getDbPool() {
  if (poolInstance) return poolInstance;

  // Explicit test mode
  if (process.env.NODE_ENV === 'test' || process.env.USE_TEST_MEMORY_DB === 'true') {
    return await createTestPool();
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isDesktop = process.env.IS_DESKTOP === 'true' || process.env.USE_SQLITE === 'true';
  const connectionString = process.env.DATABASE_URL;

  // Strict cloud production requirement (when not desktop app)
  if (isProduction && !isDesktop) {
    if (!connectionString) {
      const errorMsg = 'FATAL: DATABASE_URL environment variable is required in production mode. Startup aborted.';
      console.error(`\n=============================================================`);
      console.error(`  ${errorMsg}`);
      console.error(`=============================================================\n`);
      throw new Error(errorMsg);
    }

    try {
      const sslConfig = getSslConfig(connectionString);
      const pool = new pg.Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
        ...(sslConfig ? { ssl: sslConfig } : {}),
      });

      const client = await pool.connect();
      client.release();
      console.log(`✓ Connected to production PostgreSQL database (${sanitizeConnectionString(connectionString)}).`);
      poolInstance = pool;
      isRealPg = true;
      isSqlite = false;
      return poolInstance;
    } catch (err) {
      const errorMsg = `FATAL: Failed to connect to production PostgreSQL database (${sanitizeConnectionString(connectionString)}): ${err.message}`;
      console.error(`\n=============================================================`);
      console.error(`  ${errorMsg}`);
      console.error(`=============================================================\n`);
      throw new Error(errorMsg);
    }
  }

  // If connection string is provided, attempt connection
  if (connectionString) {
    try {
      const sslConfig = getSslConfig(connectionString);
      const pool = new pg.Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ...(sslConfig ? { ssl: sslConfig } : {}),
      });

      const client = await pool.connect();
      client.release();
      console.log(`✓ Connected to PostgreSQL database (${sanitizeConnectionString(connectionString)}).`);
      poolInstance = pool;
      isRealPg = true;
      isSqlite = false;
      return poolInstance;
    } catch (err) {
      console.warn(`PostgreSQL not reachable at ${sanitizeConnectionString(connectionString)} (${err.message}). Defaulting to persistent local SQLite.`);
    }
  }

  // Default Desktop Engine: High-performance, zero-config local SQLite
  const sqlitePool = createSqlitePool();
  poolInstance = sqlitePool;
  isRealPg = false;
  isSqlite = true;

  console.log(`\n=============================================================`);
  console.log(`  ✓ Persistent Local SQLite Database Initialized`);
  console.log(`  Location: ${sqlitePool.dbPath}`);
  console.log(`  Mode: WAL (Write-Ahead Logging) | ACID Durable`);
  console.log(`=============================================================\n`);

  return poolInstance;
}

export function isRealPostgreSqlConnected() {
  return isRealPg;
}

export function isSqliteActive() {
  return isSqlite;
}

export function getActiveDatabaseType() {
  if (isRealPg) return 'postgresql';
  if (isSqlite) return 'sqlite';
  return 'in-memory';
}

export function getDatabaseStoragePath() {
  if (isSqlite) return getSqliteDbPath();
  if (isRealPg) return sanitizeConnectionString(process.env.DATABASE_URL);
  return 'in-memory';
}

export async function backupActiveDatabase(customDestPath = null) {
  if (!isSqlite || !poolInstance) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(path.dirname(getSqliteDbPath()), '..', 'backups');
  const dest = customDestPath || path.join(backupDir, `hadi_petrol_backup_${timestamp}.sqlite`);

  if (!fs.existsSync(path.dirname(dest))) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
  }

  await poolInstance.backup(dest);
  return dest;
}

export function resetPool() {
  if (poolInstance) {
    if (typeof poolInstance.close === 'function') {
      poolInstance.close();
    } else if (typeof poolInstance.end === 'function') {
      poolInstance.end().catch(() => {});
    }
  }
  poolInstance = null;
  isRealPg = false;
  isSqlite = false;
  migrationsRan = false;
}

export async function runInitialMigration(pool) {
  if (migrationsRan && poolInstance === pool) return;
  await runMigrations(pool);
  migrationsRan = true;
}

export default {
  getDbPool,
  createTestPool,
  isRealPostgreSqlConnected,
  isSqliteActive,
  getActiveDatabaseType,
  getDatabaseStoragePath,
  backupActiveDatabase,
  runInitialMigration,
  sanitizeConnectionString,
  getSslConfig,
  resetPool,
};
