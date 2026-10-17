process.env.NODE_ENV = 'test';
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import { createTestPool } from '../src/db/pool.js';
import { seedInitialData } from '../src/db/seed.js';

describe('Atomic Stock Transactions & FIFO Tests', () => {
  let ownerToken;
  let cashierToken;
  let pool;

  before(async () => {
    pool = await createTestPool();
    await seedInitialData();


    // Reset tanks to known state
    await pool.query("UPDATE tanks SET current_stock = 1000 WHERE id = 'tank_petrol';");
    await pool.query("DELETE FROM loads WHERE fuel_type = 'Petrol';");

    // Insert two sequential loads
    await pool.query(`
      INSERT INTO loads (
        id, load_no, date, fuel_type, litres_received, purchase_rate, total_cost,
        litres_remaining, retail_litres_sold, bulk_litres_sold, status
      ) VALUES 
        ('test_load_1', 'L-001', NOW() - INTERVAL '2 days', 'Petrol', 400.0, 250.0, 100000.0, 400.0, 0, 0, 'active'),
        ('test_load_2', 'L-002', NOW() - INTERVAL '1 day', 'Petrol', 600.0, 260.0, 156000.0, 600.0, 0, 0, 'active');
    `);

    // Authenticate
    const oRes = await request(app).post('/api/auth/login').send({ username: 'owner', pin: '7860' });
    ownerToken = oRes.body.token;

    const cRes = await request(app).post('/api/auth/login').send({ username: 'cashier', pin: '1234' });
    cashierToken = cRes.body.token;
  });

  test('Retail sale splits volume across loads in FIFO order', async () => {
    // 500L sale should take 400L from test_load_1 and 100L from test_load_2
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        nozzleId: 'n1',
        fuelType: 'Petrol',
        openingMeter: 45210.50,
        closingMeter: 45710.50,
        litresSold: 500,
        rate: 280,
        totalSaleValue: 140000,
        cashReceived: 140000,
      });

    assert.equal(res.status, 201);
    const saleId = res.body.saleId;

    // Check load allocations
    const l1 = await pool.query("SELECT * FROM loads WHERE id = 'test_load_1';");
    const l2 = await pool.query("SELECT * FROM loads WHERE id = 'test_load_2';");

    assert.equal(parseFloat(l1.rows[0].litres_remaining), 0);
    assert.equal(l1.rows[0].status, 'depleted');
    assert.equal(parseFloat(l2.rows[0].litres_remaining), 500);

    // Check tank current stock (1000 - 500 = 500)
    const tank = await pool.query("SELECT current_stock FROM tanks WHERE id = 'tank_petrol';");
    assert.equal(parseFloat(tank.rows[0].current_stock), 500);
  });

  test('Rejects overselling when requested volume exceeds tank stock', async () => {
    // Current tank stock is 500L; request 700L
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        nozzleId: 'n1',
        fuelType: 'Petrol',
        openingMeter: 45710.50,
        closingMeter: 46410.50,
        litresSold: 700,
        rate: 280,
        totalSaleValue: 196000,
        cashReceived: 196000,
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /insufficient tank stock/i);

    // Verify stock was NOT deducted or clamped
    const tank = await pool.query("SELECT current_stock FROM tanks WHERE id = 'tank_petrol';");
    assert.equal(parseFloat(tank.rows[0].current_stock), 500);
  });

  test('Bulk dumping deducts from the same tank stock', async () => {
    const res = await request(app)
      .post('/api/bulk')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        vehicleNo: 'TL-9999',
        customerName: 'Habibullah Transport',
        fuelType: 'Petrol',
        litres: 200,
        rate: 275,
        totalAmount: 55000,
        cashPaid: 55000,
        paymentType: 'Cash',
      });

    assert.equal(res.status, 201);

    // Tank stock should now be 500 - 200 = 300
    const tank = await pool.query("SELECT current_stock FROM tanks WHERE id = 'tank_petrol';");
    assert.equal(parseFloat(tank.rows[0].current_stock), 300);

    // test_load_2 remaining should be 500 - 200 = 300
    const l2 = await pool.query("SELECT * FROM loads WHERE id = 'test_load_2';");
    assert.equal(parseFloat(l2.rows[0].litres_remaining), 300);
    assert.equal(parseFloat(l2.rows[0].bulk_litres_sold), 200);
  });

  test('Deleting a sale reverses exact per-load allocations and restores tank stock', async () => {
    // Fetch the recent retail sale
    const salesRes = await pool.query("SELECT id FROM retail_sales WHERE fuel_type = 'Petrol' ORDER BY date DESC LIMIT 1;");
    const saleId = salesRes.rows[0].id;

    const res = await request(app)
      .delete(`/api/sales/${saleId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(res.status, 200);

    // The 500L retail sale (400L from l1, 100L from l2) should be restored
    // Tank stock restored: 300 + 500 = 800
    const tank = await pool.query("SELECT current_stock FROM tanks WHERE id = 'tank_petrol';");
    assert.equal(parseFloat(tank.rows[0].current_stock), 800);

    const l1 = await pool.query("SELECT * FROM loads WHERE id = 'test_load_1';");
    const l2 = await pool.query("SELECT * FROM loads WHERE id = 'test_load_2';");

    assert.equal(parseFloat(l1.rows[0].litres_remaining), 400);
    assert.equal(l1.rows[0].status, 'active');
    assert.equal(parseFloat(l2.rows[0].litres_remaining), 400); // 300 + 100 = 400
  });

  test('Concurrent sales racing on limited stock: exactly one succeeds and one is rejected', async () => {
    // Set stock to 400L
    await pool.query("UPDATE tanks SET current_stock = 400 WHERE id = 'tank_petrol';");

    // Client A and Client B concurrently request 250L each (total 500L > 400L)
    const requestA = request(app)
      .post('/api/bulk')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        vehicleNo: 'CONCURRENT-A',
        customerName: 'Client A',
        fuelType: 'Petrol',
        litres: 250,
        rate: 280,
        totalAmount: 70000,
        cashPaid: 70000,
        paymentType: 'Cash',
      });

    const requestB = request(app)
      .post('/api/bulk')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        vehicleNo: 'CONCURRENT-B',
        customerName: 'Client B',
        fuelType: 'Petrol',
        litres: 250,
        rate: 280,
        totalAmount: 70000,
        cashPaid: 70000,
        paymentType: 'Cash',
      });

    const [resA, resB] = await Promise.all([requestA, requestB]);
    const statuses = [resA.status, resB.status].sort();

    // Exactly one must be 201 Created and one must be 400 Bad Request
    assert.deepEqual(statuses, [201, 400], 'One sale must succeed and one must be rejected');

    // Final tank stock must be exactly 400 - 250 = 150 (not negative or corrupted)
    const tank = await pool.query("SELECT current_stock FROM tanks WHERE id = 'tank_petrol';");
    assert.equal(parseFloat(tank.rows[0].current_stock), 150);
  });
});

