import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/summary - Financial and stock aggregate summary
router.get('/summary', requireAuth, async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const pool = await getDbPool();

    // 1. Retail sales totals
    const retailRes = await pool.query(`
      SELECT 
        COALESCE(SUM(litres_sold), 0) as total_litres,
        COALESCE(SUM(total_sale_value), 0) as total_revenue,
        COALESCE(SUM(cash_received), 0) as total_cash,
        COALESCE(SUM(credit_issued), 0) as total_credit
      FROM retail_sales;
    `);

    // 2. Bulk sales totals
    const bulkRes = await pool.query(`
      SELECT 
        COALESCE(SUM(litres), 0) as total_litres,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(cash_paid), 0) as total_cash,
        COALESCE(SUM(khata_amount), 0) as total_credit
      FROM bulk_sales;
    `);

    // 3. Operational expenses (excluding load freight/expenses)
    const expRes = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM daily_expenses
      WHERE load_id IS NULL;
    `);

    // 4. True historical COGS computed from load allocations
    const retailCogsRes = await pool.query(`
      SELECT COALESCE(SUM(a.quantity_allocated * l.purchase_rate), 0) as total_cogs
      FROM sale_load_allocations a
      JOIN loads l ON l.id = a.load_id;
    `);

    const bulkCogsRes = await pool.query(`
      SELECT COALESCE(SUM(a.quantity_allocated * l.purchase_rate), 0) as total_cogs
      FROM bulk_load_allocations a
      JOIN loads l ON l.id = a.load_id;
    `);

    const retail = retailRes.rows[0];
    const bulk = bulkRes.rows[0];
    const expenses = parseFloat(expRes.rows[0].total_expenses);

    const totalLitres = parseFloat(retail.total_litres) + parseFloat(bulk.total_litres);
    const totalRevenue = parseFloat(retail.total_revenue) + parseFloat(bulk.total_revenue);
    const totalCash = parseFloat(retail.total_cash) + parseFloat(bulk.total_cash);
    const totalCredit = parseFloat(retail.total_credit) + parseFloat(bulk.total_credit);
    const totalCogs = parseFloat(retailCogsRes.rows[0].total_cogs) + parseFloat(bulkCogsRes.rows[0].total_cogs);
    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - expenses;

    res.json({
      summary: {
        totalLitres,
        totalRevenue,
        totalCash,
        totalCredit,
        totalExpenses: expenses,
        totalCogs,
        grossProfit,
        netProfit,
      },
    });
  } catch (err) {
    console.error('Fetch reports summary error:', err);
    res.status(500).json({ error: 'Failed to generate financial summary.' });
  }
});

export default router;
