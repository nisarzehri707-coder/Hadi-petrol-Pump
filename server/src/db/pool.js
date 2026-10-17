import pg from 'pg';
import { newDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let poolInstance = null;
let isRealPg = false;
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

/**
 * Initializes an isolated in-memory PostgreSQL database using pg-mem.
 * Configured with noAstCoverageCheck: true to support PostgreSQL constraints.
 */
export async function createTestPool() {
  const memDb = newDb({
    autoCreateForeignKeyIndices: true,
    noAstCoverageCheck: true,
  });

  // Register standard PostgreSQL functions used in schema & transactions
  memDb.public.registerFunction({
    name: 'now',
    implementation: () => new Date(),
  });

  memDb.public.registerFunction({
    name: 'hashtext',
    args: ['text'],
    returns: 'integer',
    implementation: (str) => {
      let hash = 0;
      const s = String(str || '');
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    },
  });

  memDb.public.registerFunction({
    name: 'pg_advisory_xact_lock',
    args: ['integer'],
    implementation: () => null,
  });

  const adapter = memDb.adapters.createPg();
  const pool = new adapter.Pool();
  isRealPg = false;
  poolInstance = pool;

  // Run schema migration once
  await runInitialMigration(pool);

  return poolInstance;
}

/**
 * Gets database pool for the application.
 * Connects to real PostgreSQL when available.
 * If PostgreSQL is unavailable in development, alerts clearly and initializes standalone dev mode.
 */
export async function getDbPool() {
  if (poolInstance) return poolInstance;

  // Explicit test mode
  if (process.env.NODE_ENV === 'test' || process.env.USE_TEST_MEMORY_DB === 'true') {
    return await createTestPool();
  }

  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    try {
      const pool = new pg.Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Probe connection
      const client = await pool.connect();
      client.release();
      console.log(`✓ Connected to PostgreSQL database (${sanitizeConnectionString(connectionString)}).`);
      poolInstance = pool;
      isRealPg = true;
      return poolInstance;
    } catch (err) {
      printPostgresNotice(
        `Could not connect to PostgreSQL at ${sanitizeConnectionString(connectionString)}: ${err.message}`
      );
    }
  } else {
    printPostgresNotice('DATABASE_URL is not set in server/.env.');
  }

  // Fallback to standalone dev pool with noAstCoverageCheck so server can listen on port 3001
  return await createTestPool();
}

function printPostgresNotice(reason) {
  console.warn('\n' + '='.repeat(70));
  console.warn('⚠️  POSTGRESQL NOT DETECTED — STANDALONE DEV MODE ACTIVE');
  console.warn('='.repeat(70));
  console.warn(reason);
  console.warn('\nBackend is starting on in-memory engine so the Vite frontend proxy connects.');
  console.warn('⚠️  WARNING: Changes made in this mode will NOT persist across restarts!');
  console.warn('To enable persistent multi-device shared data:');
  console.warn('  1. Start PostgreSQL on Windows: Get-Service *postgres* | Start-Service');
  console.warn('  2. Create database: createdb -U postgres hadi_petrol_db');
  console.warn('  3. Configure credentials in server/.env:');
  console.warn('     DATABASE_URL=postgres://<username>:<password>@localhost:5432/hadi_petrol_db');
  console.warn('='.repeat(70) + '\n');
}

export function isRealPostgreSqlConnected() {
  return isRealPg;
}

export async function runInitialMigration(pool) {
  if (migrationsRan && poolInstance === pool) return;
  const migrationPath = path.resolve(__dirname, '../../db/migrations/001_initial_schema.sql');
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    migrationsRan = true;
  }
}

export default {
  getDbPool,
  createTestPool,
  isRealPostgreSqlConnected,
  runInitialMigration,
  sanitizeConnectionString,
};
