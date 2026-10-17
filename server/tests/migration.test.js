process.env.NODE_ENV = 'test';
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createTestPool, getDbPool } from '../src/db/pool.js';
import { seedInitialData } from '../src/db/seed.js';
import { migrateLocalStorageData } from '../src/db/migrateLocalStorage.js';

describe('Data Migration & Demo Data Filtering Tests', () => {
  before(async () => {
    await createTestPool();
    await seedInitialData();
  });


  test('Filters out demo customers and imports genuine accounts accurately', async () => {
    const mockLocalStorageData = {
      station: {
        name: 'Hadi Petroleum Live',
        ownerName: 'Haji Hadi',
        petrolRate: 280.0,
        dieselRate: 285.0,
      },
      customers: [
        {
          id: 'c_real_1',
          name: 'Baloch Goods Transport',
          vehicleNo: 'BLC-9821',
          phone: '0333-1122334',
          balanceKhata: 85000,
        },
        {
          id: 'c_real_2',
          name: 'Quetta Dumper Association',
          vehicleNo: 'QTA-5544',
          phone: '0300-9988776',
          balanceKhata: 42000,
        },
        {
          id: 'demo_cust_1',
          name: 'Demo Customer Account',
          vehicleNo: 'ABC-123',
          phone: '0300-0000000',
          balanceKhata: 5000,
        },
      ],
      loads: [
        {
          id: 'load_real_1',
          loadNo: 'L-101',
          fuelType: 'Diesel',
          litresReceived: 10000,
          purchaseRate: 260,
          totalCost: 2600000,
          litresRemaining: 10000,
          status: 'active',
        },
        {
          id: 'load_demo_99',
          loadNo: 'L-DEMO-99',
          fuelType: 'Diesel',
          litresReceived: 5000,
          purchaseRate: 200,
          totalCost: 1000000,
          litresRemaining: 5000,
          status: 'active',
        },
      ],
    };

    const report = await migrateLocalStorageData(mockLocalStorageData, { dryRun: false, excludeDemo: true });

    assert.equal(report.valid, true);
    assert.equal(report.records.customers, 2, 'Only 2 real customers should be imported');
    assert.equal(report.demoRecordsDetected, 2, '2 demo records should be detected and excluded');
    assert.equal(report.records.loads, 1, 'Only 1 real load should be imported');
    assert.equal(report.financialTotals.totalKhataDebt, 127000, 'Sum of real debts: 85,000 + 42,000');

    // Verify in database
    const pool = await getDbPool();
    const cRes = await pool.query("SELECT * FROM customers WHERE id = 'c_real_1';");
    assert.equal(cRes.rows.length, 1);
    assert.equal(parseFloat(cRes.rows[0].balance_khata), 85000);

    const demoRes = await pool.query("SELECT * FROM customers WHERE id = 'demo_cust_1';");
    assert.equal(demoRes.rows.length, 0, 'Demo customer must NOT exist in DB');
  });
});
