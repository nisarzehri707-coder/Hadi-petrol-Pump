import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbPool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const pool = await getDbPool();
  const migrationsDir = path.resolve(__dirname, '../../db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`Running ${files.length} migrations...`);
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`Applying ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✓ Applied ${file}`);
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
