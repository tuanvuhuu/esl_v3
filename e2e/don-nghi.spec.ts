import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Màn Đơn nghỉ (37.11): duyệt (ghi vắng có phép), từ chối có xác nhận, giáo vụ ghi đơn hộ.
// Lớp và học sinh thử ở Cơ sở test, buổi học năm 2027, học sinh không có phụ huynh nối Telegram nên không gửi tin.
const stamp = String(Date.now()).slice(-6);
const CLS = `DN-${stamp}`;
const KIDS = [`An ${stamp}`, `Bình ${stamp}`, `Chi ${stamp}`];

test('đơn nghỉ: duyệt ghi vắng có phép, từ chối có xác nhận, giáo vụ ghi đơn hộ', async ({ page }) => {
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  // Dọn lớp thử còn sót của lần chạy trước bị quá giờ (E-082)
  const stale = `select id from classes where name ~ '^DN-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from attendance where class_id in (${stale})`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E đơn nghỉ', $3, 'T4 · 09:00–10:00', 'T4', '09:00', '10:00', 3, 1000000, 'DN-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const sessions = (
      await db.query<{ id: number }>(
        `insert into class_sessions (class_id, session_no, starts_at, ends_at, teacher_id, room) values
         ($1, 1, '2027-04-07 09:00+07', '2027-04-07 10:00+07', $2, 'DN-P'),
         ($1, 2, '2027-04-14 09:00+07', '2027-04-14 10:00+07', $2, 'DN-P'),
         ($1, 3, '2027-04-21 09:00+07', '2027-04-21 10:00+07', $2, 'DN-P') returning id`,
        [cls.id, teacher.id],
      )
    ).rows;
    const kids = (
      await db.query<{ id: number }>(
        `insert into students (full_name, search_key, gender, class_id, status, start_date)
         select n, lower(n), 'female', $1, 'active', '2027-04-07' from unnest($2::text[]) n returning id`,
        [cls.id, KIDS],
      )
    ).rows;
    await db.query(
      `insert into leave_requests (student_id, session_id, status, reason) values ($1, $3, 'pending', 'Ốm, sức khoẻ'), ($2, $3, 'pending', 'Đi xa')`,
      [kids[0].id, kids[1].id, sessions[0].id],
    );

    await login(page);
    await page.goto(`/don-nghi?cls=${cls.id}`);
    await expect(page.getByRole('heading', { name: 'Đơn nghỉ', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Chờ duyệt/ })).toContainText('2');

    // Duyệt đơn của An: ghi vắng vào điểm danh ngày của buổi
    await page.getByRole('button', { name: `Duyệt đơn của ${KIDS[0]}` }).click();
    await expectToast(page, `Đã duyệt đơn nghỉ của ${KIDS[0]}`);
    const [mark] = (await db.query<{ mark: string }>(`select mark from attendance where student_id = $1 and session_date = '2027-04-07'`, [kids[0].id])).rows;
    expect(mark.mark).toBe('absent');

    // Từ chối đơn của Bình: có hộp xác nhận
    await page.getByRole('button', { name: `Từ chối đơn của ${KIDS[1]}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Từ chối đơn' }).click();
    await expectToast(page, `Đã từ chối đơn nghỉ của ${KIDS[1]}`);
    await expect(page.getByText('Không có đơn nào chờ duyệt.')).toBeVisible();

    // Tab Tất cả hiện cả hai đơn với trạng thái mới
    await page.getByRole('button', { name: /^Tất cả/ }).click();
    await expect(page.getByText('Đã duyệt').first()).toBeVisible();
    await expect(page.getByText('Từ chối', { exact: true }).first()).toBeVisible();

    // Giáo vụ ghi đơn hộ cho Chi buổi 14/04: duyệt ngay
    await page.getByRole('button', { name: 'Ghi đơn nghỉ' }).click();
    const dlg = page.getByRole('dialog', { name: 'Ghi đơn nghỉ' });
    await dlg.getByRole('button', { name: 'Học sinh nghỉ' }).click();
    await page.getByRole('option', { name: KIDS[2] }).click();
    await dlg.getByRole('button', { name: 'Buổi nghỉ' }).click();
    await page.getByRole('option', { name: /14\/04 09:00/ }).click();
    await dlg.getByPlaceholder('VD: Ốm, phụ huynh gọi điện báo').fill('Phụ huynh gọi điện');
    await dlg.getByRole('button', { name: 'Ghi đơn nghỉ' }).click();
    await expectToast(page, `Đã ghi đơn nghỉ cho ${KIDS[2]}`);
    const [added] = (await db.query<{ status: string; reason: string; parent_id: number | null }>(`select status, reason, parent_id from leave_requests where student_id = $1`, [kids[2].id])).rows;
    expect(added).toEqual({ status: 'approved', reason: 'Phụ huynh gọi điện', parent_id: null });
  } finally {
    await db.query(`delete from attendance where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query(`delete from classes where name = $1`, [CLS]);
    await db.end();
  }
});
