import bcrypt from 'bcryptjs';
import { getDbPool } from './pool.js';

export async function seedInitialData() {
  const pool = await getDbPool();

  const ownerUsername = process.env.INITIAL_OWNER_USERNAME || 'owner';
  const ownerPin = process.env.INITIAL_OWNER_PIN || '7860';
  const cashierUsername = process.env.INITIAL_CASHIER_USERNAME || 'cashier';
  const cashierPin = process.env.INITIAL_CASHIER_PIN || '1234';

  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const ownerHash = await bcrypt.hash(ownerPin, rounds);
  const cashierHash = await bcrypt.hash(cashierPin, rounds);

  // 1. Station Config
  await pool.query(`
    INSERT INTO station_config (
      id, station_name, station_name_urdu, address, phone, owner_name, currency,
      petrol_rate, diesel_rate, petrol_purchase_rate, diesel_purchase_rate
    ) VALUES (
      'default', 'Hadi Petroleum Service', 'ہادی پیٹرولیم سروس',
      'Main National Highway, Quetta-Karachi Road', '0300-1234567',
      'Haji Hadi Khan', 'PKR', 279.75, 285.50, 268.00, 273.50
    )
    ON CONFLICT (id) DO UPDATE SET
      station_name = EXCLUDED.station_name,
      owner_name = EXCLUDED.owner_name;
  `);

  // 2. Users
  await pool.query(`
    INSERT INTO users (username, role, name, password_hash)
    VALUES ($1, 'owner', 'Haji Hadi (Owner)', $2)
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `, [ownerUsername, ownerHash]);

  await pool.query(`
    INSERT INTO users (username, role, name, password_hash)
    VALUES ($1, 'cashier', 'Shift Operator', $2)
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `, [cashierUsername, cashierHash]);

  // 3. Tanks
  await pool.query(`
    INSERT INTO tanks (id, fuel_type, name, current_stock, capacity, min_alert)
    VALUES 
      ('tank_petrol', 'Petrol', 'Underground Petrol Tank #1', 8500.00, 15000.00, 1500.00),
      ('tank_diesel', 'Diesel', 'Underground Diesel Tank #1', 14200.00, 25000.00, 2500.00)
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Nozzles
  await pool.query(`
    INSERT INTO nozzles (id, tank_id, fuel_type, name, label, last_meter, is_active)
    VALUES
      ('n1', 'tank_petrol', 'Petrol', 'Nozzle 1', 'Front Island - Petrol', 45210.50, true),
      ('n2', 'tank_petrol', 'Petrol', 'Nozzle 2', 'Rear Island - Petrol', 38920.00, true),
      ('n3', 'tank_diesel', 'Diesel', 'Nozzle 3', 'Heavy Island - Diesel A', 89410.20, true),
      ('n4', 'tank_diesel', 'Diesel', 'Nozzle 4', 'Heavy Island - Diesel B', 76350.00, true)
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('Initial station configuration, users, tanks, and nozzles seeded.');
}

if (process.argv[1] === import.meta.url) {
  seedInitialData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
