process.env.NODE_ENV = 'test';
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import { createTestPool } from '../src/db/pool.js';
import { seedInitialData } from '../src/db/seed.js';

describe('All Backend Endpoints Verification Test Suite', () => {
  let authToken = null;

  before(async () => {
    await createTestPool();
    await seedInitialData();

    // Authenticate as owner to get valid token for protected endpoints
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'owner', pin: '7860' });

    assert.equal(loginRes.status, 200);
    authToken = loginRes.body.token;
    assert.ok(authToken, 'Token should be returned');
  });

  test('GET /api/health returns status ok and database connection information', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(typeof res.body.realPostgresConnected === 'boolean');
  });

  test('GET /api/auth/me returns authenticated user details', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, 'owner');
    assert.equal(res.body.user.role, 'owner');
  });

  test('GET /api/station/bootstrap returns station config, tanks, and nozzles', async () => {
    const res = await request(app)
      .get('/api/station/bootstrap')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.station, 'Must include station config');
    assert.ok(Array.isArray(res.body.tanks), 'Must include tanks array');
    assert.ok(Array.isArray(res.body.nozzles), 'Must include nozzles array');
  });

  test('GET /api/loads returns loads list', async () => {
    const res = await request(app)
      .get('/api/loads')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.loads), 'Must return loads array');
  });

  test('GET /api/sales returns sales list', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.sales), 'Must return sales array');
  });

  test('GET /api/bulk returns bulk dumping list', async () => {
    const res = await request(app)
      .get('/api/bulk')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.bulkSales), 'Must return bulkSales array');
  });

  test('GET /api/customers returns customer accounts list', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.customers), 'Must return customers array');
  });

  test('GET /api/khata/transactions returns khata ledger transactions', async () => {
    const res = await request(app)
      .get('/api/khata/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.transactions), 'Must return transactions array');
  });

  test('GET /api/expenses returns expenses list', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.expenses), 'Must return expenses array');
  });

  test('GET /api/shifts returns shift records', async () => {
    const res = await request(app)
      .get('/api/shifts')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.shifts), 'Must return shifts array');
  });
});
