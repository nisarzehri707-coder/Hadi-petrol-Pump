import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth, requireOwner, requireStaff } from '../middleware/auth.js';

const router = express.Router();

// GET /api/loads - List all procurement loads
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getDbPool();
    const [loadsRes, expensesRes] = await Promise.all([
      pool.query('SELECT * FROM loads ORDER BY date DESC;'),
      pool.query('SELECT * FROM load_expenses ORDER BY date ASC;'),
    ]);

    const expensesByLoad = {};
    for (const exp of expensesRes.rows) {
      if (!expensesByLoad[exp.load_id]) expensesByLoad[exp.load_id] = [];
      expensesByLoad[exp.load_id].push({
        id: exp.id,
        title: exp.title,
        category: exp.category,
        amount: parseFloat(exp.amount),
        notes: exp.notes,
        date: exp.date,
      });
    }

    res.json({
      loads: loadsRes.rows.map(row => ({
        id: row.id,
        loadNo: row.load_no,
        date: row.date,
        vehicleType: row.vehicle_type,
        vehicleNo: row.vehicle_no,
        fuelType: row.fuel_type,
        litresReceived: parseFloat(row.litres_received),
        purchaseRate: parseFloat(row.purchase_rate),
        totalCost: parseFloat(row.total_cost),
        litresRemaining: parseFloat(row.litres_remaining),
        retailLitresSold: parseFloat(row.retail_litres_sold),
        bulkLitresSold: parseFloat(row.bulk_litres_sold),
        status: row.status,
        supplierName: row.supplier_name,
        driverName: row.driver_name,
        notes: row.notes,
        expenses: expensesByLoad[row.id] || [],
      })),
    });
  } catch (err) {
    console.error('Fetch loads error:', err);
    res.status(500).json({ error: 'Failed to retrieve procurement loads.' });
  }
});

// POST /api/loads - Create a new tanker load and atomically add to underground tank (Owner only)
router.post('/', requireAuth, requireOwner, async (req, res) => {
  const {
    id, loadNo, date, vehicleType, vehicleNo, fuelType,
    litresReceived, purchaseRate, totalCost, supplierName, driverName, notes, expenses = []
  } = req.body;

  const litres = parseFloat(litresReceived);
  const rate = parseFloat(purchaseRate);
  const cost = parseFloat(totalCost) || (litres * rate);

  if (!fuelType || isNaN(litres) || litres <= 0 || isNaN(rate) || rate <= 0) {
    return res.status(400).json({ error: 'Valid fuel type, litres received, and purchase rate are required.' });
  }

  const loadId = id || `load_${Date.now()}`;
  const loadNumber = loadNo || `L-${Date.now().toString().slice(-4)}`;

  const pool = await getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Lock the destination fuel tank and verify capacity
    const tankRes = await client.query(
      'SELECT * FROM tanks WHERE fuel_type = $1 FOR UPDATE;',
      [fuelType]
    );

    if (tankRes.rows.length === 0) {
      throw new Error(`Tank for fuel type "${fuelType}" not found.`);
    }

    const currentTankStock = parseFloat(tankRes.rows[0].current_stock);
    const tankCapacity = parseFloat(tankRes.rows[0].capacity);

    if (currentTankStock + litres > tankCapacity * 1.05) {
      console.warn(`Load volume (${litres}L) exceeds nominal tank capacity (${tankCapacity}L). Alerting.`);
    }

    // 2. Insert load record
    await client.query(`
      INSERT INTO loads (
        id, load_no, date, vehicle_type, vehicle_no, fuel_type,
        litres_received, purchase_rate, total_cost, litres_remaining,
        retail_litres_sold, bulk_litres_sold, status, supplier_name, driver_name, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, 'active', $11, $12, $13, $14);
    `, [
      loadId, loadNumber, date || new Date().toISOString(), vehicleType || '', vehicleNo || '',
      fuelType, litres, rate, cost, litres, supplierName || '', driverName || '', notes || '', req.user.id
    ]);

    // 3. Insert any attached load expenses
    for (const exp of expenses) {
      const expId = exp.id || `lexp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`
        INSERT INTO load_expenses (id, load_id, title, category, amount, notes, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [
        expId, loadId, exp.title || 'Expense', exp.category || 'Other',
        parseFloat(exp.amount) || 0, exp.notes || '', exp.date || date || new Date().toISOString()
      ]);
    }

    // 4. Update underground tank inventory
    const newTankStock = currentTankStock + litres;
    await client.query(
      'UPDATE tanks SET current_stock = $1, last_updated = NOW() WHERE fuel_type = $2;',
      [newTankStock, fuelType]
    );

    await client.query('COMMIT;');

    res.status(201).json({
      message: 'Procurement load added and tank stock updated successfully.',
      loadId,
      newTankStock,
    });
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Create load error:', err);
    res.status(500).json({ error: err.message || 'Failed to create procurement load.' });
  } finally {
    client.release();
  }
});

// POST /api/loads/:id/expenses - Add an expense to an existing load (Staff permitted)
router.post('/:id/expenses', requireAuth, requireStaff, async (req, res) => {
  const loadId = req.params.id;
  const { title, category, amount, notes, date } = req.body;

  const expAmount = parseFloat(amount);
  if (!title || isNaN(expAmount) || expAmount <= 0) {
    return res.status(400).json({ error: 'Valid title and positive expense amount required.' });
  }

  try {
    const pool = await getDbPool();
    const expId = `lexp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await pool.query(`
      INSERT INTO load_expenses (id, load_id, title, category, amount, notes, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [expId, loadId, title, category || 'Freight', expAmount, notes || '', date || new Date().toISOString()]);

    res.status(201).json({ message: 'Load expense recorded.', expenseId: expId });
  } catch (err) {
    console.error('Add load expense error:', err);
    res.status(500).json({ error: 'Failed to record load expense.' });
  }
});

export default router;
