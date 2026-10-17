import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth, requireOwner, requireStaff } from '../middleware/auth.js';
import { allocateStockFIFO, reverseStockAllocation, withTankLock } from '../utils/stockDeduction.js';

const router = express.Router();


// GET /api/bulk - List bulk vehicle dumping sales
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getDbPool();
    const limit = parseInt(req.query.limit || '100', 10);

    const bulkRes = await pool.query(
      'SELECT * FROM bulk_sales ORDER BY date DESC LIMIT $1;',
      [limit]
    );

    const bulkIds = bulkRes.rows.map(b => b.id);
    const allocationsByBulk = {};

    if (bulkIds.length > 0) {
      const allocRes = await pool.query(
        'SELECT * FROM bulk_load_allocations ORDER BY id ASC;'
      );
      for (const a of allocRes.rows) {
        if (!allocationsByBulk[a.bulk_id]) allocationsByBulk[a.bulk_id] = [];
        allocationsByBulk[a.bulk_id].push({
          loadId: a.load_id,
          quantity: parseFloat(a.quantity_allocated),
        });
      }
    }

    res.json({
      bulkSales: bulkRes.rows.map(row => ({
        id: row.id,
        vehicleNo: row.vehicle_no,
        customerName: row.customer_name,
        customerId: row.customer_id,
        fuelType: row.fuel_type,
        litres: parseFloat(row.litres),
        rate: parseFloat(row.rate),
        totalAmount: parseFloat(row.total_amount),
        cashPaid: parseFloat(row.cash_paid),
        khataAmount: parseFloat(row.khata_amount),
        paymentType: row.payment_type,
        operatorName: row.operator_name,
        notes: row.notes,
        date: row.date,
        allocatedLoadDetails: row.allocated_loads || [],
      })),
    });
  } catch (err) {
    console.error('Fetch bulk sales error:', err);
    res.status(500).json({ error: 'Failed to retrieve bulk sales.' });
  }
});

// POST /api/bulk - Record bulk vehicle dumping sale with atomic FIFO stock allocation
router.post('/', requireAuth, requireStaff, async (req, res) => {
  const {
    id, vehicleNo, customerName, customerId, fuelType, litres, rate,
    totalAmount, cashPaid, khataAmount, paymentType, operatorName, notes, date
  } = req.body;

  const qty = parseFloat(litres);
  const bulkRate = parseFloat(rate);
  const total = parseFloat(totalAmount) || (qty * bulkRate);
  const cash = parseFloat(cashPaid) || 0;
  const khata = parseFloat(khataAmount) || 0;

  if (!vehicleNo || !fuelType || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Vehicle number, fuel type, and positive litres are required.' });
  }
  if (khata > 0 && !customerId && !customerName) {
    return res.status(400).json({ error: 'Customer name or ID is required for Khata credit.' });
  }

  return withTankLock(fuelType, async () => {
    const pool = await getDbPool();
    const client = await pool.connect();
    const bulkId = id || `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;


  try {
    await client.query('BEGIN;');

    // 1. Perform atomic FIFO stock deduction with row-level locks
    const { allocations } = await allocateStockFIFO(client, {
      fuelType,
      requestedLitres: qty,
      transactionType: 'bulk',
    });

    // 2. Insert bulk sale record
    await client.query(`
      INSERT INTO bulk_sales (
        id, vehicle_no, customer_name, customer_id, fuel_type, litres, rate,
        total_amount, cash_paid, khata_amount, payment_type, operator_name,
        notes, date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
    `, [
      bulkId, vehicleNo, customerName || 'Walk-in Bulk', customerId || null,
      fuelType, qty, bulkRate, total, cash, khata, paymentType || 'Cash',
      operatorName || req.user.name, notes || '', date || new Date().toISOString(), req.user.id
    ]);

    // 3. Insert FIFO load allocation junction records
    for (const alloc of allocations) {
      if (!alloc.loadId) continue;
      await client.query(`
        INSERT INTO bulk_load_allocations (bulk_id, load_id, quantity_allocated)
        VALUES ($1, $2, $3);
      `, [bulkId, alloc.loadId, alloc.quantity]);
    }

    // 4. Update Khata customer balance if credit portion exists
    if (khata > 0 && customerId) {
      await client.query(`
        UPDATE customers
        SET balance_khata = balance_khata + $1,
            last_transaction = NOW()
        WHERE id = $2;
      `, [khata, customerId]);

      const txId = `ktx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`
        INSERT INTO khata_transactions (
          id, customer_id, type, fuel_type, litres, rate, total_bill,
          paid_amount, khata_amount, notes, operator, sale_ref_id, is_bulk, date, created_by
        ) VALUES ($1, $2, 'Sale', $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13);
      `, [
        txId, customerId, fuelType, qty, bulkRate, total, cash, khata,
        notes || `Bulk sale dumping (${vehicleNo})`, operatorName || req.user.name,
        bulkId, date || new Date().toISOString(), req.user.id
      ]);
    }

    await client.query('COMMIT;');

    res.status(201).json({
      message: 'Bulk sale recorded successfully.',
      bulkId,
      allocatedLoadDetails: allocations,
    });
    } catch (err) {
      await client.query('ROLLBACK;');
      console.error('Record bulk sale error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Failed to record bulk sale.' });
    } finally {
      client.release();
    }
  });
});


// DELETE /api/bulk/:id - Void bulk sale and reverse stock allocations (Owner only)
router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  const bulkId = req.params.id;

  const pool = await getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    const bulkRes = await client.query('SELECT * FROM bulk_sales WHERE id = $1 FOR UPDATE;', [bulkId]);
    if (bulkRes.rows.length === 0) {
      throw new Error(`Bulk sale "${bulkId}" not found.`);
    }

    const bulk = bulkRes.rows[0];

    const allocRes = await client.query('SELECT * FROM bulk_load_allocations WHERE bulk_id = $1;', [bulkId]);
    const allocations = allocRes.rows.map(r => ({
      loadId: r.load_id,
      quantity: parseFloat(r.quantity_allocated),
    }));

    // Atomically reverse stock
    await reverseStockAllocation(client, {
      fuelType: bulk.fuel_type,
      allocations,
      totalLitres: parseFloat(bulk.litres),
      transactionType: 'bulk',
    });

    // Reverse Khata debt if credit was extended
    if (bulk.customer_id && parseFloat(bulk.khata_amount) > 0) {
      await client.query(`
        UPDATE customers
        SET balance_khata = balance_khata - $1
        WHERE id = $2;
      `, [parseFloat(bulk.khata_amount), bulk.customer_id]);

      await client.query('DELETE FROM khata_transactions WHERE sale_ref_id = $1;', [bulkId]);
    }

    await client.query('DELETE FROM bulk_sales WHERE id = $1;', [bulkId]);

    await client.query('COMMIT;');

    res.json({ message: 'Bulk sale voided and stock allocations reversed cleanly.' });
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Delete bulk sale error:', err);
    res.status(500).json({ error: err.message || 'Failed to void bulk sale.' });
  } finally {
    client.release();
  }
});

export default router;
