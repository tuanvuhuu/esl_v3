// Đặt mật khẩu cho tài khoản. Mật khẩu đọc từ biến môi trường ESL_NEW_PASSWORD, không in ra màn hình.
// Dùng:
//   node --env-file-if-exists=.env.local --import tsx src/db/set-password.ts <email>
//   node --env-file-if-exists=.env.local --import tsx src/db/set-password.ts --all-missing
// --all-missing: đặt cho mọi tài khoản chưa có mật khẩu (dùng khi dev sau khi nạp dữ liệu mẫu).
import { eq, isNull } from 'drizzle-orm';
import { hashPassword } from '../lib/auth/password';
import { db } from './client';
import { accounts, auditLogs } from './schema';

async function main() {
  const password = process.env.ESL_NEW_PASSWORD ?? '';
  if (password.length < 10) {
    throw new Error('ESL_NEW_PASSWORD phải có ít nhất 10 ký tự.');
  }
  const arg = process.argv[2];
  if (!arg) throw new Error('Thiếu email, hoặc dùng --all-missing.');

  const targets = arg === '--all-missing'
    ? await db.select({ id: accounts.id, email: accounts.email }).from(accounts).where(isNull(accounts.passwordHash))
    : await db.select({ id: accounts.id, email: accounts.email }).from(accounts).where(eq(accounts.email, arg.toLowerCase()));
  if (targets.length === 0) {
    console.log('Không có tài khoản nào cần đặt mật khẩu.');
    return;
  }

  const hash = await hashPassword(password);
  for (const target of targets) {
    await db.update(accounts).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(accounts.id, target.id));
    await db.insert(auditLogs).values({
      accountId: null,
      action: 'set_password',
      entity: 'account',
      entityId: String(target.id),
      summary: `Đặt mật khẩu cho ${target.email} (công cụ dòng lệnh)`,
    });
    console.log(`Đã đặt mật khẩu cho ${target.email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
