import { defineConfig } from 'drizzle-kit';

// drizzle-kit không tự đọc .env.local, nên script db:* đã nạp biến qua --env-file (xem package.json)
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
