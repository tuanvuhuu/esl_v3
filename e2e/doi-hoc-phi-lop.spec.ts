import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Đổi học phí lớp (đang có học sinh): mặc định học sinh đang học giữ học phí cũ, học sinh đã có học phí riêng không đổi.
// Lớp thử ở Cơ sở test, học phí 5.000.000 ₫ đổi thành 6.000.000 ₫.
const run = String(Date.now()).slice(-6);
const CLS = `DH-${run}`;
const STD = `Học viên giữ giá ${run}`;
const OWN = `Học viên giá riêng ${run}`;

test('đổi học phí lớp: học sinh đang học giữ học phí cũ, học sinh có học phí riêng giữ nguyên', async ({ page }) => {
  test.setTimeout(120_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^DH-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E đổi học phí', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 5000000, 'DH-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [std] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [STD, `hoc vien gia ${run}`, cls.id])).rows;
    const [own] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date, tuition_fee) values ($1, $2, 'male', $3, 'active', '2026-09-01', 4500000) returning id`, [OWN, `hoc vien rieng ${run}`, cls.id])).rows;

    await login(page);
    await page.goto(`/lop-hoc/${cls.id}`);
    await page.getByRole('button', { name: 'Sửa lớp', exact: true }).click();
    const form = page.getByRole('dialog').last();
    const fee = form.getByLabel('Học phí (VND) *');
    await fee.fill('6000000');
    await expect(form.getByLabel(/Nếu đổi học phí: học sinh đang học giữ học phí cũ/)).toBeChecked();
    await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, /1 học sinh giữ học phí cũ/);

    const [stdRow] = (await db.query<{ tuition_fee: number | null }>(`select tuition_fee from students where id = $1`, [std.id])).rows;
    expect(stdRow.tuition_fee).toBe(5000000);
    const [ownRow] = (await db.query<{ tuition_fee: number | null }>(`select tuition_fee from students where id = $1`, [own.id])).rows;
    expect(ownRow.tuition_fee).toBe(4500000);
    const [clsRow] = (await db.query<{ fee: number }>(`select fee from classes where id = $1`, [cls.id])).rows;
    expect(clsRow.fee).toBe(6000000);
  } finally {
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.end();
  }
});
