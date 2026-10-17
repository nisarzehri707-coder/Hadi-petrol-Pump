import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { getDbPool, runInitialMigration, isRealPostgreSqlConnected } from './db/pool.js';
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
const PORT = process.env.PORT || 3001;

// CORS configuration - allow both localhost and explicit 127.0.0.1 Vite origins
const configuredOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = new Set([
  configuredOrigin,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
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
  res.json({
    status: 'ok',
    database: isRealPg ? 'postgresql' : 'in-memory-dev',
    realPostgresConnected: isRealPg,
    multiDeviceSyncReady: isRealPg,
    time: new Date().toISOString(),
    warning: isRealPg ? null : 'PostgreSQL is offline on localhost:5432. Standalone in-memory dev mode is active. Changes will not persist across restarts and will not sync across multiple devices.',
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
    await runInitialMigration(pool);
    await seedInitialData();

    return new Promise((resolve) => {
      // Bind to 127.0.0.1 (explicit IPv4) so the Vite proxy target 127.0.0.1:3001 connects reliably
      const server = app.listen(PORT, '127.0.0.1', () => {
        const isRealPg = isRealPostgreSqlConnected();
        console.log(`\n=============================================================`);
        console.log(`  Hadi Petrolium backend listening on http://127.0.0.1:${PORT}`);
        console.log(`  Database Status: ${isRealPg ? '✓ Real PostgreSQL Connected (Multi-device Ready)' : '⚠️  PostgreSQL Offline - Standalone Dev Mode (In-Memory)'}`);
        console.log(`=============================================================\n`);
        resolve(server);
      });
    });
  } catch (err) {
    if (err.message === 'DATABASE_CONNECTION_FAILED' || err.message === 'DATABASE_URL_MISSING') {
      process.exit(1);
    }
    console.error('Fatal startup error:', err.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}


export default app;
