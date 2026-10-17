import express from 'express';
import { getDbPool } from '../db/pool.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';
import { migrateLocalStorageData } from '../db/migrateLocalStorage.js';

const router = express.Router();


// GET /api/station/bootstrap - Full station snapshot for frontend initial load
router.get('/bootstrap', requireAuth, async (req, res) => {
  try {
    const pool = await getDbPool();

    const [configRes, tanksRes, nozzlesRes, ratesRes] = await Promise.all([
      pool.query('SELECT * FROM station_config WHERE id = $1;', ['default']),
      pool.query('SELECT * FROM tanks ORDER BY id ASC;'),
      pool.query('SELECT * FROM nozzles ORDER BY id ASC;'),
      pool.query('SELECT * FROM station_config WHERE id = $1;', ['default']),
    ]);

    const config = configRes.rows[0] || {};

    res.json({
      station: {
        name: config.station_name || 'Hadi Petroleum Service',
        nameUrdu: config.station_name_urdu || 'ہادی پیٹرولیم سروس',
        address: config.address || '',
        phone: config.phone || '',
        ownerName: config.owner_name || 'Haji Hadi Khan',
        currency: config.currency || 'PKR',
        petrolRate: parseFloat(config.petrol_rate) || 279.75,
        dieselRate: parseFloat(config.diesel_rate) || 285.50,
        petrolPurchaseRate: parseFloat(config.petrol_purchase_rate) || 268.00,
        dieselPurchaseRate: parseFloat(config.diesel_purchase_rate) || 273.50,
      },
      tanks: tanksRes.rows.map(t => ({
        id: t.id,
        fuelType: t.fuel_type,
        name: t.name,
        currentStock: parseFloat(t.current_stock),
        capacity: parseFloat(t.capacity),
        minAlert: parseFloat(t.min_alert),
        lastUpdated: t.last_updated,
      })),
      nozzles: nozzlesRes.rows.map(n => ({
        id: n.id,
        tankId: n.tank_id,
        fuelType: n.fuel_type,
        name: n.name,
        label: n.label,
        lastMeter: parseFloat(n.last_meter),
        isActive: n.is_active,
      })),
    });
  } catch (err) {
    console.error('Station bootstrap error:', err);
    res.status(500).json({ error: 'Failed to fetch station configuration.' });
  }
});

// PUT /api/station/rates - Update selling and purchase fuel rates (Owner only)
router.put('/rates', requireAuth, requireOwner, async (req, res) => {
  const { petrolRate, dieselRate, petrolPurchaseRate, dieselPurchaseRate } = req.body;

  try {
    const pool = await getDbPool();
    await pool.query(`
      UPDATE station_config
      SET petrol_rate = COALESCE($1, petrol_rate),
          diesel_rate = COALESCE($2, diesel_rate),
          petrol_purchase_rate = COALESCE($3, petrol_purchase_rate),
          diesel_purchase_rate = COALESCE($4, diesel_purchase_rate),
          updated_at = NOW()
      WHERE id = 'default';
    `, [petrolRate, dieselRate, petrolPurchaseRate, dieselPurchaseRate]);

    res.json({ message: 'Fuel rates updated successfully.' });
  } catch (err) {
    console.error('Update rates error:', err);
    res.status(500).json({ error: 'Failed to update fuel rates.' });
  }
});

// POST /api/station/migrate - Preview or execute migration from localStorage backup (Owner only)
router.post('/migrate', requireAuth, requireOwner, async (req, res) => {
  const isDryRun = req.query.dryRun === 'true' || req.body.dryRun === true;
  const excludeDemo = req.body.excludeDemo !== false;

  try {
    const report = await migrateLocalStorageData(req.body.data || req.body, {
      dryRun: isDryRun,
      excludeDemo,
    });

    res.json({
      message: isDryRun ? 'Migration preview completed (dry run).' : 'Data migration committed successfully.',
      report,
    });
  } catch (err) {
    console.error('Migration endpoint error:', err);
    res.status(500).json({ error: err.message || 'Data migration failed.' });
  }
});

export default router;


