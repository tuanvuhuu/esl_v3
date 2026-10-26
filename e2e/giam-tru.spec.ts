import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { dialogFieldErrors, expectToast, login } from './helpers';

// Giảm trừ học phí (cố định theo số tiền, không theo phần trăm). Lớp thử ở Cơ sở test, học phí 5.000.000 ₫.
// Sửa học sinh: giảm trừ 600.000 ₫ được lưu; giảm trừ lớn hơn học phí bị chặn; hồ sơ và ghi thu dùng học phí thực thu 4.400.000 ₫.
const run = String(Date.now()).slice(-6);
const CLS = `GT-${run}`;
const KID = `Bé giảm trừ ${run}`;
const PARENT = `PH giảm trừ ${run}`;

test('giảm trừ học phí theo số tiền: lưu, chặn quá học phí, học phí thực thu trong hồ sơ và ghi thu', async ({ page }) => {
  test.setTimeout(150_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^GT-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  await db.query(`delete from parents where full_name like 'PH giảm trừ %'`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E giảm trừ', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 5000000, 'GT-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [KID, `be giam tru ${run}`, cls.id])).rows;
    const [parent] = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [PARENT, `09${run}12`])).rows;
    await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', true)`, [kid.id, parent.id]);

    await login(page);
    await page.goto(`/hoc-sinh?q=${encodeURIComponent(KID)}`);
    await page.getByRole('button', { name: `Thao tác với ${KID}`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    const form = page.getByRole('dialog', { name: 'Sửa thông tin học sinh' });
    const discount = form.locator('input[name="tuitionDiscount"]');
    await expect(discount).toHaveValue('');
    await discount.fill('600000');
    await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, `Đã lưu thay đổi cho ${KID}`);
    expect((await db.query<{ tuition_discount: number }>(`select tuition_discount from students where id = $1`, [kid.id])).rows[0].tuition_discount).toBe(600000);

    // Giảm trừ lớn hơn học phí thì không lưu được
    await page.getByRole('button', { name: `Thao tác với ${KID}`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    const again = page.getByRole('dialog', { name: 'Sửa thông tin học sinh' });
    await expect(again.locator('input[name="tuitionDiscount"]')).toHaveValue('600.000');
    await again.locator('input[name="tuitionDiscount"]').fill('9000000');
    await again.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(dialogFieldErrors(page).first()).toContainText('Không được lớn hơn học phí');
    await page.keyboard.press('Escape');

    // Hồ sơ: học phí thực thu 4.400.000 ₫ và dòng giảm trừ
    await page.goto(`/hoc-sinh/${kid.id}`);
    await expect(page.getByText('Học phí khoá (sau giảm trừ)')).toBeVisible();
    await expect(page.getByText('4.400.000 ₫', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('− 600.000 ₫', { exact: true })).toBeVisible();

    // Ghi thu: không thu quá số còn nợ thực tế (4.400.000 ₫)
    await page.goto(`/hoc-phi?q=${encodeURIComponent(KID)}`);
    await page.getByRole('button', { name: 'Ghi thu' }).first().click();
    const pay = page.locator('[role="dialog"][aria-labelledby="payment-title"]');
    await pay.locator('input[name="amount"]').fill('5000000');
    await pay.getByRole('button', { name: 'Ghi nhận thu' }).click();
    await expect(dialogFieldErrors(page).first()).toContainText('4.400.000');
  } finally {
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.query(`delete from parents where full_name = $1`, [PARENT]);
    await db.end();
  }
});
