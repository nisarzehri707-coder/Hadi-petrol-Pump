import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sqliteInstance = null;
let currentDbPath = null;

export function getResolvedSqlitePath() {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH;
  }

  if (process.env.NODE_ENV === 'test' || process.env.USE_TEST_MEMORY_DB === 'true') {
    return ':memory:';
  }

  // Windows Desktop standard persistent directory
  const appDataRoot = process.env.APPDATA || (process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support')
    : path.join(os.homedir(), '.config'));

  const appDataDir = path.join(appDataRoot, 'Hadi Petrol Pump', 'database');
  return path.join(appDataDir, 'hadi_petrol.sqlite');
}

export function normalizeSqlAndParams(sql, rawParams = []) {
  if (!sql || typeof sql !== 'string') return { normalized: sql, params: rawParams };

  // 1. Transform cross-token intervals
  let transformed = sql
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*days?'/gi, "datetime('now', '-$1 days')")
    .replace(/NOW\(\)\s*\+\s*INTERVAL\s*'(\d+)\s*days?'/gi, "datetime('now', '+$1 days')")
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*hours?'/gi, "datetime('now', '-$1 hours')")
    .replace(/NOW\(\)\s*\+\s*INTERVAL\s*'(\d+)\s*hours?'/gi, "datetime('now', '+$1 hours')");

  // 2. Clean raw parameter types
  const cleanParams = rawParams.map(p => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    return p;
  });

  const finalParams = [];

  // 3. Split by single-quoted string literals to preserve password hashes, notes, etc.
  const parts = transformed.split(/('(?:''|[^'])*')/g);
  for (let i = 0; i < parts.length; i += 2) {
    // Only modify outside quoted string literals
    parts[i] = parts[i]
      .replace(/\bSERIAL\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/\bJSONB\b/gi, 'TEXT')
      .replace(/TIMESTAMP\s+WITH\s+TIME\s+ZONE/gi, 'TEXT')
      .replace(/\bDEFAULT\s+NOW\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP')
      .replace(/::\w+/g, '')
      .replace(/\s+FOR\s+UPDATE\b/gi, '')
      .replace(/\$(\d+)/g, (_, numStr) => {
        const index = parseInt(numStr, 10) - 1;
        finalParams.push(cleanParams[index]);
        return '?';
      });
  }

  return {
    normalized: parts.join(''),
    params: finalParams.length > 0 ? finalParams : cleanParams,
  };
}

export function normalizeSql(sql) {
  return normalizeSqlAndParams(sql, []).normalized;
}

export function createSqlitePool(customPath = null) {
  if (sqliteInstance) return sqliteInstance;

  const dbPath = customPath || getResolvedSqlitePath();
  currentDbPath = dbPath;

  if (dbPath !== ':memory:') {
    const parentDir = path.dirname(dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  // Enable WAL mode & foreign keys for high performance & durability
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Register standard PostgreSQL compatibility functions with varargs: true
  db.function('now', () => new Date().toISOString());
  db.function('greatest', { varargs: true }, (...args) => {
    const valid = args.map(Number).filter(n => !isNaN(n));
    return valid.length > 0 ? Math.max(...valid) : 0;
  });
  db.function('least', { varargs: true }, (...args) => {
    const valid = args.map(Number).filter(n => !isNaN(n));
    return valid.length > 0 ? Math.min(...valid) : 0;
  });
  db.function('hashtext', { varargs: true }, (str) => {
    let hash = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  });
  db.function('pg_advisory_xact_lock', { varargs: true }, () => 1);

  // In-process mutex to handle transaction serialization
  let activeTransaction = false;

  async function executeQuery(rawSql, rawParams = []) {
    const trimmed = rawSql.trim();
    const { normalized, params } = normalizeSqlAndParams(rawSql, rawParams);

    // Transaction control statements
    if (/^BEGIN\b/i.test(trimmed)) {
      if (!activeTransaction) {
        db.exec('BEGIN IMMEDIATE;');
        activeTransaction = true;
      }
      return { rows: [], rowCount: 0 };
    }

    if (/^COMMIT\b/i.test(trimmed)) {
      if (activeTransaction) {
        db.exec('COMMIT;');
        activeTransaction = false;
      }
      return { rows: [], rowCount: 0 };
    }

    if (/^ROLLBACK\b/i.test(trimmed)) {
      if (activeTransaction) {
        db.exec('ROLLBACK;');
        activeTransaction = false;
      }
      return { rows: [], rowCount: 0 };
    }

    // Multiple statements (e.g. migration script)
    if (trimmed.includes(';') && trimmed.split(';').filter(s => s.trim().length > 0).length > 1) {
      db.exec(normalized);
      return { rows: [], rowCount: 0 };
    }

    const isSelect = /^\s*(SELECT|PRAGMA)\b/i.test(trimmed);
    const stmt = db.prepare(normalized);

    if (isSelect) {
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    } else {
      const info = stmt.run(...params);
      return {
        rows: [],
        rowCount: info.changes,
        lastInsertRowid: info.lastInsertRowid,
      };
    }
  }

  const pool = {
    isSqlite: true,
    dbPath,
    get rawDb() {
      return db;
    },
    query: executeQuery,
    connect: async () => {
      return {
        query: executeQuery,
        release: () => {},
      };
    },
    backup: async (destPath) => {
      if (dbPath === ':memory:') return false;
      const backupDir = path.dirname(destPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      await db.backup(destPath);
      return true;
    },
    close: () => {
      if (db.open) {
        try {
          db.pragma('wal_checkpoint(TRUNCATE)');
          db.close();
        } catch (e) {
          console.error('Error closing SQLite DB:', e);
        }
      }
      sqliteInstance = null;
    },
  };

  sqliteInstance = pool;
  return sqliteInstance;
}

export function getSqliteDbPath() {
  return currentDbPath || getResolvedSqlitePath();
}

export default {
  createSqlitePool,
  getResolvedSqlitePath,
  getSqliteDbPath,
  normalizeSqlAndParams,
  normalizeSql,
};
