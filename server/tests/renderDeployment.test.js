import { test, describe, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app, { getAllowedOrigins } from '../src/index.js';
import { getDbPool, createTestPool, resetPool, getSslConfig } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedInitialData } from '../src/db/seed.js';

describe('Render Deployment & Database Integrity Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetPool();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetPool();
  });

  test('CORS origin configuration supports single, multiple, and trailing slashes', () => {
    process.env.CORS_ORIGIN = 'https://hadi-frontend.onrender.com/, https://custom-domain.com';
    const allowed = getAllowedOrigins();

    // Both with and without trailing slash should be recognized
    assert.ok(allowed.has('https://hadi-frontend.onrender.com'));
    assert.ok(allowed.has('https://hadi-frontend.onrender.com/'));
    assert.ok(allowed.has('https://custom-domain.com'));
    assert.ok(allowed.has('https://custom-domain.com/'));
    assert.ok(allowed.has('http://localhost:5173'));
  });

  test('CORS middleware accepts requests from configured CORS_ORIGIN', async () => {
    process.env.CORS_ORIGIN = 'https://hadi-frontend.onrender.com';

    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://hadi-frontend.onrender.com');

    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://hadi-frontend.onrender.com');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  test('CORS middleware blocks requests from unauthorized origins', async () => {
    process.env.CORS_ORIGIN = 'https://hadi-frontend.onrender.com';

    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://malicious-website.com');

    // CORS block should prevent Access-Control-Allow-Origin from being sent
    assert.notEqual(res.headers['access-control-allow-origin'], 'https://malicious-website.com');
  });

  test('getSslConfig configures SSL for Neon and sslmode=require', () => {
    assert.deepEqual(
      getSslConfig('postgresql://user:pass@ep-fragrant.us-east-2.aws.neon.tech/neondb?sslmode=require'),
      { rejectUnauthorized: false }
    );
    assert.deepEqual(
      getSslConfig('postgresql://user:pass@render-db.internal:5432/db?sslmode=require'),
      { rejectUnauthorized: false }
    );
    assert.equal(
      getSslConfig('postgres://user:pass@localhost:5432/db?sslmode=disable'),
      false
    );
  });

  test('In production, getDbPool throws if DATABASE_URL is missing without in-memory fallback', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;

    await assert.rejects(
      async () => {
        await getDbPool();
      },
      (err) => {
        assert.match(err.message, /DATABASE_URL environment variable is required in production mode/i);
        return true;
      }
    );
  });

  test('In production, getDbPool throws if PostgreSQL connection fails without in-memory fallback', async () => {
    process.env.NODE_ENV = 'production';
    // Provide an unreachable database host
    process.env.DATABASE_URL = 'postgresql://fake_user:fake_pass@127.0.0.1:54329/fake_db?sslmode=disable';

    await assert.rejects(
      async () => {
        await getDbPool();
      },
      (err) => {
        assert.match(err.message, /Failed to connect to production PostgreSQL database/i);
        return true;
      }
    );
  });

  test('Migrations and seeding do not reset or overwrite existing data', async () => {
    process.env.NODE_ENV = 'test';
    const pool = await createTestPool();

    // 1. Initial seed
    await seedInitialData(pool);

    // 2. Simulate user modifying station name and rate in live application
    await pool.query(`
      UPDATE station_config 
      SET station_name = 'Custom Petrol Pump Live', petrol_rate = 299.99 
      WHERE id = 'default';
    `);

    // 3. Simulate user updating owner's password
    await pool.query(`
      UPDATE users 
      SET password_hash = '$2a$10$customModifiedPasswordHashForTesting' 
      WHERE username = 'owner';
    `);

    // 4. Run migrations again (e.g. server restart)
    await runMigrations(pool);

    // 5. Run seed again (e.g. server restart)
    await seedInitialData(pool);

    // Verify station data was NOT overwritten
    const stationRes = await pool.query("SELECT station_name, petrol_rate FROM station_config WHERE id = 'default';");
    assert.equal(stationRes.rows[0].station_name, 'Custom Petrol Pump Live', 'Station name should not be reset');
    assert.equal(parseFloat(stationRes.rows[0].petrol_rate), 299.99, 'Petrol rate should not be reset');

    // Verify user password was NOT reset
    const userRes = await pool.query("SELECT password_hash FROM users WHERE username = 'owner';");
    assert.equal(userRes.rows[0].password_hash, '$2a$10$customModifiedPasswordHashForTesting', 'Password hash must not be reset to initial default');
  });
});
