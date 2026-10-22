import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import {
  getDbPool,
  isRealPostgreSqlConnected,
  isSqliteActive,
  getActiveDatabaseType,
  getDatabaseStoragePath,
} from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { seedInitialData } from './db/seed.js';

import authRoutes from './routes/auth.js';
import stationRoutes from './routes/station.js';
import loadsRoutes from './routes/loads.js';
import salesRoutes from './routes/sales.js';
import bulkRoutes from './routes/bulk.js';
import customersRoutes from './routes/customers.js';
import khataRoutes from './routes/khata.js';
import expensesRoutes from './routes/expenses.js';
import shiftsRoutes from './routes/shifts.js';
import reportsRoutes from './routes/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// CORS configuration - support CORS_ORIGIN for deployed frontend, comma-separated lists, and localhost
export function getAllowedOrigins() {
  const origins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://hadi-petrol-pump.vercel.app',
    'https://hadi-petrol-pump.vercel.app/',
  ]);

  if (process.env.CORS_ORIGIN) {
    const list = process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
    for (const item of list) {
      origins.add(item);
      if (item.endsWith('/')) {
        origins.add(item.slice(0, -1));
      } else {
        origins.add(`${item}/`);
      }
    }
  }

  return origins;
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps, same-origin)
    if (!origin) {
      return callback(null, true);
    }

    if (process.env.CORS_ORIGIN === '*') {
      return callback(null, true);
    }

    const allowed = getAllowedOrigins();
    const cleanOrigin = origin.trim().replace(/\/$/, '');

    if (
      allowed.has(origin) ||
      allowed.has(cleanOrigin) ||
      cleanOrigin === 'https://hadi-petrol-pump.vercel.app' ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}. Allowed:`, Array.from(allowed));
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/station', stationRoutes);
app.use('/api/loads', loadsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/khata', khataRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isRealPg = isRealPostgreSqlConnected();
  const isSqlite = isSqliteActive();
  const dbType = getActiveDatabaseType();
  res.json({
    status: 'ok',
    database: dbType,
    realPostgresConnected: isRealPg,
    sqliteActive: isSqlite,
    storagePath: getDatabaseStoragePath(),
    multiDeviceSyncReady: isRealPg,
    time: new Date().toISOString(),
    warning: isRealPg ? null : (isSqlite ? 'PostgreSQL is offline. Running with persistent local SQLite engine.' : 'Standalone in-memory dev mode active.'),
  });
});

// Serve frontend build static files if dist exists
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

export async function startServer() {
  try {
    const pool = await getDbPool();
    await runMigrations(pool);
    await seedInitialData(pool);

    return new Promise((resolve, reject) => {
      // Bind to 0.0.0.0 so Render, cloud containers, and local proxies can route traffic
      const server = app.listen(PORT, HOST, () => {
        const isRealPg = isRealPostgreSqlConnected();
        const dbType = getActiveDatabaseType();
        console.log(`\n=============================================================`);
        console.log(`  Hadi Petrolium backend listening on http://${HOST}:${PORT}`);
        console.log(`  Port: ${PORT} (process.env.PORT compatible for Render)`);
        console.log(`  Database Status: ${isRealPg ? '✓ Real PostgreSQL Connected (Multi-device Ready)' : `⚠️  PostgreSQL Offline - Local Database Active (${dbType})`}`);
        console.log(`=============================================================\n`);
        resolve(server);
      });
      server.on('error', (err) => {
        console.error('Fatal server listen error:', err.message);
        reject(err);
      });
    });
  } catch (err) {
    console.error('Fatal startup error:', err.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}


export default app;
