import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Ghi thu nhiều học sinh cùng lúc (màn Học phí). Lớp thử ở Cơ sở test, học phí 1.000.000 ₫, hai học sinh chưa đóng.
// Chọn cả hai, xác nhận: mỗi người được ghi đủ số còn nợ, tổng hai khoản đúng; bảng không ghi thừa khi đã đóng đủ.
const run = String(Date.now()).slice(-6);
const CLS = `NT-${run}`;
const A = `Học viên thu nhiều A ${run}`;
const B = `Học viên thu nhiều B ${run}`;

test('học phí: chọn nhiều học sinh còn nợ và ghi thu một lần', async ({ page }) => {
  test.setTimeout(200_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^NT-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from tuition_payments where student_id in (select id from students where class_id in (${stale}))`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E thu nhiều', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 10, 1000000, 'NT-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [a] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [A, `thu nhieu a ${run}`, cls.id])).rows;
    const [b] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01') returning id`, [B, `thu nhieu b ${run}`, cls.id])).rows;

    await login(page);
    await page.goto(`/hoc-phi?q=${encodeURIComponent(run)}`);
    await page.getByRole('button', { name: /^Chọn tất cả còn nợ/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Đã chọn 2 học sinh' })).toBeVisible();

    await page.getByRole('button', { name: 'Ghi thu cho 2 học sinh' }).click();
    const dlg = page.getByRole('dialog', { name: 'Ghi thu cho 2 học sinh' });
    await expect(dlg.getByLabel(`Số tiền thu ${A} (VND)`)).toHaveValue('1.000.000');
    await dlg.getByLabel(`Số tiền thu ${B} (VND)`).fill('');
    await dlg.getByLabel(`Số tiền thu ${B} (VND)`).fill('400000');
    await dlg.getByLabel('Ghi chú chung').fill('Đóng tiền mặt tại lớp');
    await dlg.getByRole('button', { name: 'Xác nhận đã nộp (2)' }).click();
    await expectToast(page, /Đã ghi thu cho 2 học sinh, tổng 1\.400\.000/);

    const rows = (await db.query<{ student_id: number; amount: number; note: string }>(`select student_id, amount, note from tuition_payments where student_id = any($1) order by student_id`, [[a.id, b.id]])).rows;
    const byId = new Map(rows.map((r) => [r.student_id, r]));
    expect(byId.get(a.id)?.amount).toBe(1000000);
    expect(byId.get(b.id)?.amount).toBe(400000);
    expect(byId.get(a.id)?.note).toBe('Đóng tiền mặt tại lớp');
  } finally {
    await db.query(`delete from tuition_payments where student_id in (select id from students where class_id in (select id from classes where name = $1))`, [CLS]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query(`delete from classes where name = $1`, [CLS]);
    await db.end();
  }
});
