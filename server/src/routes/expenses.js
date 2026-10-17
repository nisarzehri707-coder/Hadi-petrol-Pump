import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth, requireOwner, requireStaff } from '../middleware/auth.js';

const router = express.Router();

// GET /api/expenses - List general operational expenses
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getDbPool();
    // Exclude load direct expenses to prevent duplicate counting (H2 & M9 fix)
    const expRes = await pool.query(`
      SELECT * FROM daily_expenses
      WHERE load_id IS NULL
      ORDER BY date DESC
      LIMIT 200;
    `);

    res.json({
      expenses: expRes.rows.map(e => ({
        id: e.id,
        category: e.category,
        amount: parseFloat(e.amount),
        paidTo: e.paid_to,
        notes: e.notes,
        loadId: e.load_id,
        date: e.date,
      })),
    });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ error: 'Failed to retrieve expenses.' });
  }
});

// POST /api/expenses - Record operational expense (Staff permitted)
router.post('/', requireAuth, requireStaff, async (req, res) => {
  const { id, category, amount, paidTo, notes, date, loadId } = req.body;
  const expAmount = parseFloat(amount);

  if (!category || isNaN(expAmount) || expAmount <= 0) {
    return res.status(400).json({ error: 'Valid category and positive expense amount required.' });
  }

  const expId = id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const pool = await getDbPool();

    // If loadId is specified, insert into load_expenses to keep operational expenses clean
    if (loadId) {
      await pool.query(`
        INSERT INTO load_expenses (id, load_id, title, category, amount, notes, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [expId, loadId, notes || category, category, expAmount, notes || '', date || new Date().toISOString()]);

      return res.status(201).json({ message: 'Load expense recorded.', expenseId: expId });
    }

    await pool.query(`
      INSERT INTO daily_expenses (id, category, amount, paid_to, notes, load_id, date, created_by)
      VALUES ($1, $2, $3, $4, $5, NULL, $6, $7);
    `, [expId, category, expAmount, paidTo || '', notes || '', date || new Date().toISOString(), req.user.id]);

    res.status(201).json({ message: 'Expense recorded successfully.', expenseId: expId });
  } catch (err) {
    console.error('Record expense error:', err);
    res.status(500).json({ error: 'Failed to record expense.' });
  }
});

// DELETE /api/expenses/:id - Delete expense (Owner only)
router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  const expId = req.params.id;

  try {
    const pool = await getDbPool();
    await pool.query('DELETE FROM daily_expenses WHERE id = $1;', [expId]);
    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

export default router;
