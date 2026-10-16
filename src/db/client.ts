// Kết nối PostgreSQL dùng chung cho toàn server. Chỉ import từ code chạy trên server.
// Kết nối được tạo ở lần dùng đầu tiên, không phải lúc nạp module. Nhờ vậy `next build` không cần DATABASE_URL:
// build trên máy chủ không có chuỗi kết nối vẫn thu thập được cấu hình các route (E-064).
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Thiếu DATABASE_URL. Sao chép .env.example thành .env.local rồi điền chuỗi kết nối PostgreSQL.');
  }
  return new Pool({ connectionString, max: 10 });
}

// Giữ một pool duy nhất. Khi Next.js nạp lại module trong lúc phát triển, pool cũ vẫn được dùng tiếp.
let productionPool: Pool | undefined;
function getPool(): Pool {
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.pool ??= createPool();
    return globalForDb.pool;
  }
  productionPool ??= createPool();
  return productionPool;
}

function createDb() {
  return drizzle(getPool(), { schema });
}

let dbInstance: ReturnType<typeof createDb> | undefined;
function getDb(): ReturnType<typeof createDb> {
  dbInstance ??= createDb();
  return dbInstance;
}

// Đối tượng bọc: chỉ tạo kết nối khi có lần truy cập đầu tiên. Hàm được gọi đúng trên đối tượng gốc.
function lazy<T extends object>(create: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      // Không tạo kết nối khi có ai đó kiểm tra `then` (ví dụ khi trả về từ hàm bất đồng bộ)
      if (prop === 'then') return undefined;
      const real = create();
      const value = Reflect.get(real, prop, real);
      return typeof value === 'function' ? value.bind(real) : value;
    },
  });
}

export const pool: Pool = lazy(getPool);
export const db: ReturnType<typeof createDb> = lazy(getDb);
