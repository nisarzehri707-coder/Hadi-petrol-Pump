import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth, requireOwner, requireStaff } from '../middleware/auth.js';
import { allocateStockFIFO, reverseStockAllocation, withTankLock } from '../utils/stockDeduction.js';

const router = express.Router();


// GET /api/sales - List recent retail shift sales with load allocations
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getDbPool();
    const limit = parseInt(req.query.limit || '100', 10);

    const salesRes = await pool.query(
      'SELECT * FROM retail_sales ORDER BY date DESC LIMIT $1;',
      [limit]
    );

    const saleIds = salesRes.rows.map(s => s.id);
    const allocationsBySale = {};

    if (saleIds.length > 0) {
      const allocRes = await pool.query(
        'SELECT * FROM sale_load_allocations ORDER BY id ASC;'
      );
      for (const a of allocRes.rows) {
        if (!allocationsBySale[a.sale_id]) allocationsBySale[a.sale_id] = [];
        allocationsBySale[a.sale_id].push({
          loadId: a.load_id,
          quantity: parseFloat(a.quantity_allocated),
        });
      }
    }

    res.json({
      sales: salesRes.rows.map(row => ({
        id: row.id,
        nozzleId: row.nozzle_id,
        fuelType: row.fuel_type,
        openingMeter: parseFloat(row.opening_meter),
        closingMeter: parseFloat(row.closing_meter),
        litresSold: parseFloat(row.litres_sold),
        rate: parseFloat(row.rate),
        totalSaleValue: parseFloat(row.total_sale_value),
        cashReceived: parseFloat(row.cash_received),
        creditIssued: parseFloat(row.credit_issued),
        creditCustomerId: row.credit_customer_id,
        operatorName: row.operator_name,
        notes: row.notes,
        date: row.date,
        allocatedLoadDetails: row.allocated_loads || [],
      })),
    });
  } catch (err) {
    console.error('Fetch retail sales error:', err);
    res.status(500).json({ error: 'Failed to retrieve retail sales.' });
  }
});

// POST /api/sales - Record retail nozzle sale with atomic FIFO stock allocation
router.post('/', requireAuth, requireStaff, async (req, res) => {
  const {
    id, nozzleId, fuelType, openingMeter, closingMeter, litresSold, rate,
    totalSaleValue, cashReceived, creditIssued, creditCustomerId, creditCustomerName,
    operatorName, notes, date
  } = req.body;

  const opening = parseFloat(openingMeter);
  const closing = parseFloat(closingMeter);
  const litres = parseFloat(litresSold);
  const saleRate = parseFloat(rate);
  const totalValue = parseFloat(totalSaleValue) || (litres * saleRate);
  const cash = parseFloat(cashReceived) || 0;
  const credit = parseFloat(creditIssued) || 0;

  // Validation
  if (isNaN(litres) || litres <= 0) {
    return res.status(400).json({ error: 'Litres sold must be greater than zero.' });
  }
  if (closing < opening) {
    return res.status(400).json({ error: 'Closing meter reading cannot be lower than opening meter.' });
  }
  if (credit > totalValue + 0.01) {
    return res.status(400).json({ error: `Credit issued (${credit}) cannot exceed total sale value (${totalValue}).` });
  }
  if (credit > 0 && !creditCustomerId) {
    return res.status(400).json({ error: 'Customer must be selected for credit transactions.' });
  }

  return withTankLock(fuelType, async () => {
    const pool = await getDbPool();
    const client = await pool.connect();
    const saleId = id || `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;


  try {
    await client.query('BEGIN;');

    // 1. Verify nozzle last meter reading
    const nozzleRes = await client.query('SELECT * FROM nozzles WHERE id = $1 FOR UPDATE;', [nozzleId]);
    if (nozzleRes.rows.length === 0) {
      throw new Error(`Dispensing nozzle "${nozzleId}" not found.`);
    }

    const nozzle = nozzleRes.rows[0];
    const lastMeter = parseFloat(nozzle.last_meter);
    if (opening < lastMeter - 0.01) {
      throw new Error(`Opening meter (${opening}) cannot be backdated below nozzle last recorded reading (${lastMeter}).`);
    }

    // 2. Perform atomic FIFO stock deduction with row-level locks
    const { allocations } = await allocateStockFIFO(client, {
      fuelType,
      requestedLitres: litres,
      transactionType: 'retail',
    });

    // 3. Update nozzle last meter reading
    await client.query(
      'UPDATE nozzles SET last_meter = $1 WHERE id = $2;',
      [closing, nozzleId]
    );

    // 4. Insert retail sale record
    await client.query(`
      INSERT INTO retail_sales (
        id, nozzle_id, fuel_type, opening_meter, closing_meter, litres_sold,
        rate, total_sale_value, cash_received, credit_issued, credit_customer_id,
        operator_name, notes, date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
    `, [
      saleId, nozzleId, fuelType, opening, closing, litres, saleRate, totalValue,
      cash, credit, creditCustomerId || null, operatorName || req.user.name, notes || '',
      date || new Date().toISOString(), req.user.id
    ]);

    // 5. Insert FIFO load allocation junction records
    for (const alloc of allocations) {
      if (!alloc.loadId) continue;
      await client.query(`
        INSERT INTO sale_load_allocations (sale_id, load_id, quantity_allocated)
        VALUES ($1, $2, $3);
      `, [saleId, alloc.loadId, alloc.quantity]);
    }

    // 6. Handle credit issuance in Khata
    if (credit > 0 && creditCustomerId) {
      await client.query(`
        UPDATE customers
        SET balance_khata = balance_khata + $1,
            last_transaction = NOW()
        WHERE id = $2;
      `, [credit, creditCustomerId]);

      const txId = `ktx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`
        INSERT INTO khata_transactions (
          id, customer_id, type, fuel_type, litres, rate, total_bill,
          paid_amount, khata_amount, notes, operator, sale_ref_id, is_bulk, date, created_by
        ) VALUES ($1, $2, 'Sale', $3, $4, $5, $6, 0, $7, $8, $9, $10, false, $11, $12);
      `, [
        txId, creditCustomerId, fuelType, litres, saleRate, totalValue, credit,
        notes || `Retail credit sale (${litres}L)`, operatorName || req.user.name,
        saleId, date || new Date().toISOString(), req.user.id
      ]);
    }

    await client.query('COMMIT;');

    res.status(201).json({
      message: 'Retail sale recorded successfully.',
      saleId,
      allocatedLoadDetails: allocations,
    });
    } catch (err) {
      await client.query('ROLLBACK;');
      console.error('Record retail sale error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Failed to record retail sale.' });
    } finally {
      client.release();
    }
  });
});


// DELETE /api/sales/:id - Void retail sale and atomically reverse stock and debt (Owner only)
router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  const saleId = req.params.id;

  const pool = await getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Fetch sale details
    const saleRes = await client.query('SELECT * FROM retail_sales WHERE id = $1 FOR UPDATE;', [saleId]);
    if (saleRes.rows.length === 0) {
      throw new Error(`Sale with ID "${saleId}" not found.`);
    }

    const sale = saleRes.rows[0];

    // 2. Fetch load allocations for exact reversal
    const allocRes = await client.query('SELECT * FROM sale_load_allocations WHERE sale_id = $1;', [saleId]);
    const allocations = allocRes.rows.map(r => ({
      loadId: r.load_id,
      quantity: parseFloat(r.quantity_allocated),
    }));

    // 3. Atomically reverse stock to loads and storage tank
    await reverseStockAllocation(client, {
      fuelType: sale.fuel_type,
      allocations,
      totalLitres: parseFloat(sale.litres_sold),
      transactionType: 'retail',
    });

    // 4. Revert nozzle last_meter if it was the last sale
    await client.query(`
      UPDATE nozzles
      SET last_meter = $1
      WHERE id = $2 AND last_meter = $3;
    `, [sale.opening_meter, sale.nozzle_id, sale.closing_meter]);

    // 5. If credit was issued, reverse customer debt & delete linked transaction
    if (sale.credit_customer_id && parseFloat(sale.credit_issued) > 0) {
      await client.query(`
        UPDATE customers
        SET balance_khata = balance_khata - $1
        WHERE id = $2;
      `, [parseFloat(sale.credit_issued), sale.credit_customer_id]);

      await client.query('DELETE FROM khata_transactions WHERE sale_ref_id = $1;', [saleId]);
    }

    // 6. Delete sale record (sale_load_allocations deleted by CASCADE)
    await client.query('DELETE FROM retail_sales WHERE id = $1;', [saleId]);

    await client.query('COMMIT;');

    res.json({ message: 'Retail sale voided and stock allocations reversed cleanly.' });
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Delete sale error:', err);
    res.status(500).json({ error: err.message || 'Failed to void retail sale.' });
  } finally {
    client.release();
  }
});

export default router;
