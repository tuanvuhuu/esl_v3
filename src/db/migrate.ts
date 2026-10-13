// Chạy migration: npm run db:migrate
import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

async function main() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'db', 'migrations') });
  console.log('Migration xong.');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Migration lỗi:', err);
  await pool.end();
  process.exit(1);
});
