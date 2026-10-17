import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth, requireOwner, requireStaff } from '../middleware/auth.js';

const router = express.Router();

// GET /api/khata/transactions - List ledger transactions
router.get('/transactions', requireAuth, async (req, res) => {
  const { customerId, limit = '200' } = req.query;

  try {
    const pool = await getDbPool();
    let query = 'SELECT * FROM khata_transactions ';
    let params = [];

    if (customerId) {
      query += 'WHERE customer_id = $1 ';
      params.push(customerId);
    }

    query += 'ORDER BY date DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit, 10));

    const txRes = await pool.query(query, params);

    res.json({
      transactions: txRes.rows.map(t => ({
        id: t.id,
        customerId: t.customer_id,
        type: t.type,
        fuelType: t.fuel_type,
        litres: parseFloat(t.litres),
        rate: parseFloat(t.rate),
        totalBill: parseFloat(t.total_bill),
        paidAmount: parseFloat(t.paid_amount),
        khataAmount: parseFloat(t.khata_amount),
        notes: t.notes,
        operator: t.operator,
        saleRefId: t.sale_ref_id,
        isBulk: t.is_bulk,
        date: t.date,
      })),
    });
  } catch (err) {
    console.error('Fetch khata transactions error:', err);
    res.status(500).json({ error: 'Failed to retrieve Khata transactions.' });
  }
});

// POST /api/khata/payments - Record customer debt repayment
router.post('/payments', requireAuth, requireStaff, async (req, res) => {
  const { customerId, amount, notes, date } = req.body;
  const paymentAmount = parseFloat(amount);

  if (!customerId || isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ error: 'Customer ID and positive payment amount are required.' });
  }

  const pool = await getDbPool();
  const client = await pool.connect();
  const txId = `ktx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    await client.query('BEGIN;');

    // 1. Fetch customer with row lock
    const custRes = await client.query('SELECT * FROM customers WHERE id = $1 FOR UPDATE;', [customerId]);
    if (custRes.rows.length === 0) {
      throw new Error(`Customer with ID "${customerId}" not found.`);
    }

    const currentBalance = parseFloat(custRes.rows[0].balance_khata);
    // Allow negative balance to accurately preserve advance payments (H4 fix)
    const newBalance = currentBalance - paymentAmount;

    // 2. Update customer balance
    await client.query(`
      UPDATE customers
      SET balance_khata = $1,
          last_transaction = NOW()
      WHERE id = $2;
    `, [newBalance, customerId]);

    // 3. Insert payment ledger entry
    await client.query(`
      INSERT INTO khata_transactions (
        id, customer_id, type, total_bill, paid_amount, khata_amount,
        notes, operator, date, created_by
      ) VALUES ($1, $2, 'Payment', 0, $3, 0, $4, $5, $6, $7);
    `, [
      txId, customerId, paymentAmount,
      notes || `Cash payment received (PKR ${paymentAmount})`,
      req.user.name, date || new Date().toISOString(), req.user.id
    ]);

    await client.query('COMMIT;');

    res.status(201).json({
      message: 'Payment recorded successfully.',
      transactionId: txId,
      newBalance,
    });
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Record payment error:', err);
    res.status(500).json({ error: err.message || 'Failed to record customer payment.' });
  } finally {
    client.release();
  }
});

// DELETE /api/khata/transactions/:id - Void ledger transaction and restore balance (Owner only)
router.delete('/transactions/:id', requireAuth, requireOwner, async (req, res) => {
  const txId = req.params.id;

  const pool = await getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    const txRes = await client.query('SELECT * FROM khata_transactions WHERE id = $1 FOR UPDATE;', [txId]);
    if (txRes.rows.length === 0) {
      throw new Error(`Transaction with ID "${txId}" not found.`);
    }

    const tx = txRes.rows[0];
    const paidAmount = parseFloat(tx.paid_amount) || 0;
    const khataAmount = parseFloat(tx.khata_amount) || 0;

    // H3 fix: If deleting payment, debt increases (+paidAmount). If deleting sale, debt decreases (-khataAmount).
    const balanceDelta = tx.type === 'Payment' ? paidAmount : -khataAmount;

    await client.query(`
      UPDATE customers
      SET balance_khata = balance_khata + $1
      WHERE id = $2;
    `, [balanceDelta, tx.customer_id]);

    await client.query('DELETE FROM khata_transactions WHERE id = $1;', [txId]);

    await client.query('COMMIT;');

    res.json({ message: 'Khata transaction voided and customer balance restored.' });
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Delete khata transaction error:', err);
    res.status(500).json({ error: err.message || 'Failed to void Khata transaction.' });
  } finally {
    client.release();
  }
});

export default router;
