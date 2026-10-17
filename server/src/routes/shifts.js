import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';

const router = express.Router();

// GET /api/shifts - List shift closings
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getDbPool();
    const shiftsRes = await pool.query('SELECT * FROM shift_closings ORDER BY date DESC LIMIT 50;');

    res.json({
      shifts: shiftsRes.rows.map(s => ({
        id: s.id,
        shiftName: s.shift_name,
        operatorName: s.operator_name,
        date: s.date,
        totalLitres: parseFloat(s.total_litres),
        totalRevenue: parseFloat(s.total_revenue),
        totalCash: parseFloat(s.total_cash),
        totalCredit: parseFloat(s.total_credit),
        totalExpenses: parseFloat(s.total_expenses),
        netDrawerCash: parseFloat(s.net_drawer_cash),
        actualDrawerCash: parseFloat(s.actual_drawer_cash),
        discrepancy: parseFloat(s.discrepancy),
        status: s.status,
        notes: s.notes,
      })),
    });
  } catch (err) {
    console.error('Fetch shifts error:', err);
    res.status(500).json({ error: 'Failed to retrieve shift records.' });
  }
});

// POST /api/shifts/close - Close shift and record drawer discrepancy
router.post('/close', requireAuth, requireStaff, async (req, res) => {
  const {
    id, shiftName, operatorName, date, totalLitres, totalRevenue,
    totalCash, totalCredit, totalExpenses, netDrawerCash, actualDrawerCash,
    discrepancy, notes
  } = req.body;

  const shiftId = id || `shift_${Date.now()}`;
  const actualCash = parseFloat(actualDrawerCash) || 0;
  const netCash = parseFloat(netDrawerCash) || 0;
  const diff = parseFloat(discrepancy) || (actualCash - netCash);

  try {
    const pool = await getDbPool();
    await pool.query(`
      INSERT INTO shift_closings (
        id, shift_name, operator_name, date, total_litres, total_revenue,
        total_cash, total_credit, total_expenses, net_drawer_cash,
        actual_drawer_cash, discrepancy, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'closed', $13, $14);
    `, [
      shiftId, shiftName || 'Shift Closing', operatorName || req.user.name,
      date || new Date().toISOString(), parseFloat(totalLitres) || 0,
      parseFloat(totalRevenue) || 0, parseFloat(totalCash) || 0,
      parseFloat(totalCredit) || 0, parseFloat(totalExpenses) || 0,
      netCash, actualCash, diff, notes || '', req.user.id
    ]);

    res.status(201).json({
      message: 'Shift closed successfully.',
      shiftId,
      discrepancy: diff,
    });
  } catch (err) {
    console.error('Close shift error:', err);
    res.status(500).json({ error: 'Failed to record shift closing.' });
  }
});

export default router;
