// Dọn dữ liệu thử sau mỗi lần chạy E2E, kể cả khi có kịch bản lỗi. Chỉ xoá các bản ghi có tiền tố thử "E2E".
import { Pool } from 'pg';
import { loadEnvLocal } from './env';

export default async function globalTeardown(): Promise<void> {
  loadEnvLocal();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  const pool = new Pool({ connectionString });
  try {
    await pool.query("DELETE FROM students WHERE full_name LIKE 'HS E2E%'");
    await pool.query("DELETE FROM parents WHERE full_name LIKE 'PH E2E%'");
    await pool.query("DELETE FROM classes WHERE name LIKE 'LOP E2E%'");
    await pool.query("DELETE FROM assignments WHERE title LIKE 'BT E2E%'");
  } finally {
    await pool.end();
  }
}
