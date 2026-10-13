// Kết nối PostgreSQL dùng chung cho toàn server. Chỉ import từ code chạy trên server.
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Thiếu DATABASE_URL. Sao chép .env.example thành .env.local rồi điền chuỗi kết nối PostgreSQL.');
  }
  return new Pool({ connectionString, max: 10 });
}

// Giữ một pool duy nhất khi Next.js nạp lại module trong lúc phát triển
export const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
