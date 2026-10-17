import fs from 'fs';
import path from 'path';
import { getDbPool } from './pool.js';

export async function migrateLocalStorageData(jsonData, options = { dryRun: false, excludeDemo: true }) {
  const pool = await getDbPool();
  const client = await pool.connect();

  const report = {
    valid: true,
    dryRun: options.dryRun,
    records: {
      customers: 0,
      loads: 0,
      retailSales: 0,
      bulkSales: 0,
      khataTransactions: 0,
      expenses: 0,
      shifts: 0,
    },
    demoRecordsDetected: 0,
    conflicts: [],
    financialTotals: {
      totalKhataDebt: 0,
      totalStockPetrol: 0,
      totalStockDiesel: 0,
    },
  };

  try {
    await client.query('BEGIN;');

    // 1. Station Config & Tanks
    if (jsonData.station) {
      await client.query(`
        UPDATE station_config
        SET station_name = COALESCE($1, station_name),
            owner_name = COALESCE($2, owner_name),
            phone = COALESCE($3, phone),
            address = COALESCE($4, address),
            petrol_rate = COALESCE($5, petrol_rate),
            diesel_rate = COALESCE($6, diesel_rate),
            petrol_purchase_rate = COALESCE($7, petrol_purchase_rate),
            diesel_purchase_rate = COALESCE($8, diesel_purchase_rate)
        WHERE id = 'default';
      `, [
        jsonData.station.name, jsonData.station.ownerName, jsonData.station.phone,
        jsonData.station.address, jsonData.station.petrolRate, jsonData.station.dieselRate,
        jsonData.station.petrolPurchaseRate, jsonData.station.dieselPurchaseRate
      ]);
    }

    if (Array.isArray(jsonData.tanks)) {
      for (const t of jsonData.tanks) {
        await client.query(`
          INSERT INTO tanks (id, fuel_type, name, current_stock, capacity, min_alert)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            current_stock = EXCLUDED.current_stock,
            capacity = EXCLUDED.capacity,
            min_alert = EXCLUDED.min_alert;
        `, [t.id, t.fuelType, t.name, parseFloat(t.currentStock) || 0, parseFloat(t.capacity) || 15000, parseFloat(t.minAlert) || 1000]);

        if (t.fuelType === 'Petrol') report.financialTotals.totalStockPetrol += parseFloat(t.currentStock) || 0;
        if (t.fuelType === 'Diesel') report.financialTotals.totalStockDiesel += parseFloat(t.currentStock) || 0;
      }
    }

    // 2. Customers
    if (Array.isArray(jsonData.customers)) {
      for (const c of jsonData.customers) {
        const isDemo = c.id?.includes('demo') || c.name?.toLowerCase().includes('demo customer') || c.vehicleNo === 'ABC-123';
        if (isDemo && options.excludeDemo) {
          report.demoRecordsDetected++;
          continue;
        }

        const bal = parseFloat(c.balanceKhata) || 0;
        report.financialTotals.totalKhataDebt += bal;

        await client.query(`
          INSERT INTO customers (id, name, vehicle_no, phone, balance_khata, notes, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            vehicle_no = EXCLUDED.vehicle_no,
            phone = EXCLUDED.phone,
            balance_khata = EXCLUDED.balance_khata,
            notes = EXCLUDED.notes;
        `, [c.id, c.name, c.vehicleNo || '', c.phone || '', bal, c.notes || '', c.createdAt || new Date().toISOString()]);

        report.records.customers++;
      }
    }

    // 3. Procurement Loads & Load Expenses
    if (Array.isArray(jsonData.loads)) {
      for (const l of jsonData.loads) {
        const isDemo = l.id?.includes('demo') || l.loadNo?.includes('DEMO');
        if (isDemo && options.excludeDemo) {
          report.demoRecordsDetected++;
          continue;
        }

        await client.query(`
          INSERT INTO loads (
            id, load_no, date, vehicle_type, vehicle_no, fuel_type,
            litres_received, purchase_rate, total_cost, litres_remaining,
            retail_litres_sold, bulk_litres_sold, status, supplier_name, driver_name, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO NOTHING;
        `, [
          l.id, l.loadNo || l.id, l.date || new Date().toISOString(), l.vehicleType || '',
          l.vehicleNo || '', l.fuelType || 'Petrol', parseFloat(l.litresReceived) || 0,
          parseFloat(l.purchaseRate) || 0, parseFloat(l.totalCost) || 0,
          parseFloat(l.litresRemaining) || 0, parseFloat(l.retailLitresSold) || 0,
          parseFloat(l.bulkLitresSold) || 0, l.status || 'active',
          l.supplierName || '', l.driverName || '', l.notes || ''
        ]);

        if (Array.isArray(l.expenses)) {
          for (const exp of l.expenses) {
            await client.query(`
              INSERT INTO load_expenses (id, load_id, title, category, amount, notes, date)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id) DO NOTHING;
            `, [exp.id, l.id, exp.title, exp.category || 'Freight', parseFloat(exp.amount) || 0, exp.notes || '', exp.date || l.date]);
          }
        }

        report.records.loads++;
      }
    }

    // 4. Retail Sales
    if (Array.isArray(jsonData.sales)) {
      for (const s of jsonData.sales) {
        await client.query(`
          INSERT INTO retail_sales (
            id, nozzle_id, fuel_type, opening_meter, closing_meter, litres_sold,
            rate, total_sale_value, cash_received, credit_issued, credit_customer_id,
            operator_name, notes, date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING;
        `, [
          s.id, s.nozzleId || 'n1', s.fuelType || 'Petrol',
          parseFloat(s.openingMeter) || 0, parseFloat(s.closingMeter) || 0,
          parseFloat(s.litresSold) || 0, parseFloat(s.rate) || 0,
          parseFloat(s.totalSaleValue) || 0, parseFloat(s.cashReceived) || 0,
          parseFloat(s.creditIssued) || 0, s.creditCustomerId || null,
          s.operatorName || 'Cashier', s.notes || '', s.date || new Date().toISOString()
        ]);

        if (Array.isArray(s.allocatedLoadDetails)) {
          for (const alloc of s.allocatedLoadDetails) {
            if (!alloc.loadId) continue;
            await client.query(`
              INSERT INTO sale_load_allocations (sale_id, load_id, quantity_allocated)
              VALUES ($1, $2, $3)
              ON CONFLICT (sale_id, load_id) DO NOTHING;
            `, [s.id, alloc.loadId, parseFloat(alloc.quantity) || 0]);
          }
        }

        report.records.retailSales++;
      }
    }

    // 5. Bulk Sales
    if (Array.isArray(jsonData.bulkSales)) {
      for (const b of jsonData.bulkSales) {
        await client.query(`
          INSERT INTO bulk_sales (
            id, vehicle_no, customer_name, customer_id, fuel_type, litres, rate,
            total_amount, cash_paid, khata_amount, payment_type, operator_name, notes, date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING;
        `, [
          b.id, b.vehicleNo || '', b.customerName || '', b.customerId || null,
          b.fuelType || 'Petrol', parseFloat(b.litres) || 0, parseFloat(b.rate) || 0,
          parseFloat(b.totalAmount) || 0, parseFloat(b.cashPaid) || 0,
          parseFloat(b.khataAmount) || 0, b.paymentType || 'Cash',
          b.operatorName || 'Cashier', b.notes || '', b.date || new Date().toISOString()
        ]);

        if (Array.isArray(b.allocatedLoadDetails)) {
          for (const alloc of b.allocatedLoadDetails) {
            if (!alloc.loadId) continue;
            await client.query(`
              INSERT INTO bulk_load_allocations (bulk_id, load_id, quantity_allocated)
              VALUES ($1, $2, $3)
              ON CONFLICT (bulk_id, load_id) DO NOTHING;
            `, [b.id, alloc.loadId, parseFloat(alloc.quantity) || 0]);
          }
        }

        report.records.bulkSales++;
      }
    }

    // 6. Khata Transactions
    if (Array.isArray(jsonData.khataTransactions)) {
      for (const kt of jsonData.khataTransactions) {
        await client.query(`
          INSERT INTO khata_transactions (
            id, customer_id, type, fuel_type, litres, rate, total_bill,
            paid_amount, khata_amount, notes, operator, sale_ref_id, is_bulk, date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING;
        `, [
          kt.id, kt.customerId, kt.type || 'Sale', kt.fuelType || null,
          parseFloat(kt.litres) || 0, parseFloat(kt.rate) || 0,
          parseFloat(kt.totalBill) || 0, parseFloat(kt.paidAmount) || 0,
          parseFloat(kt.khataAmount) || 0, kt.notes || '',
          kt.operator || 'Cashier', kt.saleRefId || null,
          Boolean(kt.isBulk), kt.date || new Date().toISOString()
        ]);

        report.records.khataTransactions++;
      }
    }

    // 7. Operational Expenses
    if (Array.isArray(jsonData.expenses)) {
      for (const exp of jsonData.expenses) {
        if (exp.loadId) continue; // Exclude load expenses from global daily expenses
        await client.query(`
          INSERT INTO daily_expenses (id, category, amount, paid_to, notes, date)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `, [
          exp.id, exp.category || 'General', parseFloat(exp.amount) || 0,
          exp.paidTo || '', exp.notes || '', exp.date || new Date().toISOString()
        ]);

        report.records.expenses++;
      }
    }

    if (options.dryRun) {
      await client.query('ROLLBACK;');
      console.log('Dry run completed. Transaction rolled back cleanly.');
    } else {
      await client.query('COMMIT;');
      console.log('Migration committed successfully to database.');
    }

    return report;
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Migration failed:', err);
    report.valid = false;
    report.error = err.message;
    return report;
  } finally {
    client.release();
  }
}
