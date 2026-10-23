import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Thêm phụ huynh chọn con ngay trong form; thẻ điện thoại có liên kết "Gán học sinh" thay cho nút to.
// Lớp và học sinh thử ở Cơ sở test, không có Telegram.
const stamp = String(Date.now()).slice(-6);
const CLS = `PH-${stamp}`;
const KID = `Con PH ${stamp}`;
const PARENT = `Phụ huynh mới ${stamp}`;
const PHONE = `06${stamp}77`;

test('thêm phụ huynh kèm con; thẻ điện thoại có liên kết Gán học sinh', async ({ page }) => {
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^PH-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E phụ huynh', $3, 'T6 · 09:00–10:00', 'T6', '09:00', '10:00', 1, 1000000, 'PH-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2027-05-07') returning id`, [KID, `con ph ${stamp}`, cls.id])).rows;

    await login(page);
    await page.goto('/phu-huynh');
    await page.getByRole('button', { name: 'Thêm phụ huynh' }).first().click();
    const form = page.getByRole('dialog', { name: 'Thêm phụ huynh' });
    await form.locator('input[name="fullName"]').fill(PARENT);
    await form.locator('input[name="phone"]').fill(PHONE);
    await form.getByRole('button', { name: 'Con học ở trung tâm' }).click();
    await page.getByRole('option', { name: new RegExp(KID) }).click();
    await page.keyboard.press('Escape');
    await form.getByRole('button', { name: 'Quan hệ với con' }).click();
    await page.getByRole('option', { name: 'Bố' }).click();
    await form.getByRole('button', { name: 'Lưu phụ huynh' }).click();
    await expectToast(page, `Đã thêm ${PARENT} và gán 1 học sinh`);
    const [link] = (await db.query<{ relation: string; is_primary: boolean }>(`select sp.relation, sp.is_primary from student_parents sp join parents p on p.id = sp.parent_id where p.phone = $1 and sp.student_id = $2`, [PHONE, kid.id])).rows;
    expect(link).toEqual({ relation: 'father', is_primary: true });

    // Điện thoại: thẻ phụ huynh có liên kết "Gán học sinh", hàng nút còn Sửa, Xoá, Telegram
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/phu-huynh');
    await page.getByRole('searchbox').first().fill(PARENT);
    const card = page.locator('article, [class*="rounded"]').filter({ hasText: PARENT }).filter({ has: page.getByRole('button', { name: 'Telegram' }) }).last();
    await expect(card.getByRole('button', { name: 'Gán học sinh' })).toBeVisible();
    await expect(card.getByRole('link', { name: KID })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  } finally {
    await db.query('delete from parents where phone = $1', [PHONE]);
    await db.query(`delete from students where class_id in (${stale})`);
    await db.query(`delete from classes where id in (${stale})`);
    await db.end();
  }
});
