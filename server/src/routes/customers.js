import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';

const router = express.Router();

// GET /api/customers - List all customer Khata accounts
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getDbPool();
    const custRes = await pool.query('SELECT * FROM customers ORDER BY name ASC;');

    res.json({
      customers: custRes.rows.map(c => ({
        id: c.id,
        name: c.name,
        vehicleNo: c.vehicle_no,
        phone: c.phone,
        balanceKhata: parseFloat(c.balance_khata),
        notes: c.notes,
        lastTransaction: c.last_transaction,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Failed to retrieve customers.' });
  }
});

// POST /api/customers - Create a new customer Khata account (Staff permitted)
router.post('/', requireAuth, requireStaff, async (req, res) => {
  const { id, name, vehicleNo, phone, balanceKhata, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  const custId = id || `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const initialBalance = parseFloat(balanceKhata) || 0.00;

  try {
    const pool = await getDbPool();
    await pool.query(`
      INSERT INTO customers (id, name, vehicle_no, phone, balance_khata, notes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        vehicle_no = EXCLUDED.vehicle_no,
        phone = EXCLUDED.phone,
        notes = EXCLUDED.notes;
    `, [custId, name.trim(), vehicleNo || '', phone || '', initialBalance, notes || '']);

    res.status(201).json({
      message: 'Customer account created successfully.',
      customer: {
        id: custId,
        name: name.trim(),
        vehicleNo: vehicleNo || '',
        phone: phone || '',
        balanceKhata: initialBalance,
        notes: notes || '',
      },
    });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Failed to create customer account.' });
  }
});

// PUT /api/customers/:id - Update customer account info
router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  const customerId = req.params.id;
  const { name, vehicleNo, phone, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  try {
    const pool = await getDbPool();
    const result = await pool.query(`
      UPDATE customers
      SET name = $1, vehicle_no = $2, phone = $3, notes = $4
      WHERE id = $5;
    `, [name.trim(), vehicleNo || '', phone || '', notes || '', customerId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json({ message: 'Customer updated successfully.' });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer account.' });
  }
});

export default router;
