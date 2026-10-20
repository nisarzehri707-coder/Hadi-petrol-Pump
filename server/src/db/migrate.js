import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbPool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(targetPool) {
  const pool = targetPool || (await getDbPool());
  const migrationsDir = path.resolve(__dirname, '../../db/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }

  // Ensure migrations tracking table exists without affecting any existing tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  const appliedRes = await pool.query('SELECT name FROM schema_migrations;');
  const applied = new Set(appliedRes.rows.map((r) => r.name));

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    console.log(`Applying migration: ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1);', [file]);
    console.log(`✓ Applied migration: ${file}`);
  }
  console.log('All migrations applied successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
