process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import { createTestPool } from '../src/db/pool.js';
import { seedInitialData } from '../src/db/seed.js';

describe('Backend Authentication & Role Permission Tests', () => {
  before(async () => {
    await createTestPool();
    await seedInitialData();
  });


  test('Rejects invalid PIN with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'owner', pin: '9999' });

    assert.equal(res.status, 401);
    assert.match(res.body.error, /invalid pin/i);
  });

  test('Owner login with correct PIN returns JWT token and sets cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'owner', pin: '7860' });

    assert.equal(res.status, 200);
    assert.ok(res.body.token, 'Must return JWT token');
    assert.equal(res.body.user.role, 'owner');
    assert.equal(res.body.user.username, 'owner');
  });

  test('Cashier login with correct PIN returns role cashier', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cashier', pin: '1234' });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'cashier');
  });

  test('Cashier is blocked (403 Forbidden) from Owner-only actions', async () => {
    // 1. Login as cashier
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cashier', pin: '1234' });
    const cashierToken = loginRes.body.token;

    // 2. Attempt to update station rates
    const updateRes = await request(app)
      .put('/api/station/rates')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ petrolRate: 350.0 });

    assert.equal(updateRes.status, 403);
    assert.match(updateRes.body.error, /restricted to: owner/i);
  });

  test('Owner can successfully update fuel rates', async () => {
    // 1. Login as owner
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'owner', pin: '7860' });
    const ownerToken = loginRes.body.token;

    // 2. Attempt to update station rates
    const updateRes = await request(app)
      .put('/api/station/rates')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ petrolRate: 282.50 });

    assert.equal(updateRes.status, 200);
  });
});
