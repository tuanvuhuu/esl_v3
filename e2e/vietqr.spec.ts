import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { cronAuth, login } from './helpers';
import { tuitionPhase } from '../src/lib/telegram/prefs';

// Mã VietQR học phí (37.13): nhập tài khoản nhận học phí ở Cài đặt, hộp Ghi thu hiện mã QR khoản còn thiếu.
// Học sinh thử ở Cơ sở test, không có phụ huynh nên không gửi Telegram. Cài đặt ngân hàng được trả lại như cũ.
const stamp = String(Date.now()).slice(-6);
const CLS = `QR-${stamp}`;
const KID = `Học sinh QR ${stamp}`;

test('cài tài khoản nhận học phí; hộp Ghi thu hiện mã QR với số tiền còn thiếu', async ({ page }) => {
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^QR-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  const chatId = 9_200_000_000 + Number(stamp);
  let parentId = 0;
  const [before] =(await db.query<{ bank_bin: string; bank_account: string; bank_account_name: string }>('select bank_bin, bank_account, bank_account_name from center_settings where id = 1')).rows;
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E QR', $3, 'T6 · 09:00–10:00', 'T6', '09:00', '10:00', 1, 2500000, 'QR-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    await db.query(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $3, 'male', $2, 'active', '2027-05-07')`, [KID, cls.id, `hoc sinh qr ${stamp}`]);

    await login(page);
    await page.goto('/cai-dat');
    await page.getByRole('button', { name: 'Ngân hàng' }).click();
    await page.getByRole('option', { name: 'Vietcombank' }).click();
    await page.locator('input[name="bankAccount"]').fill('0011 0012 34567');
    await page.locator('input[name="bankAccountName"]').fill('TRUNG TAM E2E');
    await expect(page.getByRole('img', { name: 'Mã QR tài khoản nhận học phí' })).toBeVisible();
    await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
    await expect(page.getByText('Đã lưu cài đặt')).toBeVisible();
    const [saved] = (await db.query('select bank_bin, bank_account, bank_account_name from center_settings where id = 1')).rows;
    expect(saved).toEqual({ bank_bin: '970436', bank_account: '0011001234567', bank_account_name: 'TRUNG TAM E2E' });

    await page.goto(`/hoc-phi?q=${encodeURIComponent(KID)}`);
    await page.getByRole('button', { name: 'Ghi thu' }).first().click();
    await expect(page.getByRole('img', { name: `Mã QR chuyển khoản học phí của ${KID}` })).toBeVisible();
    await expect(page.getByText(/Vietcombank 0011001234567 · TRUNG TAM E2E · 2\.500\.000/)).toBeVisible();
    await expect(page.getByText(/nội dung: HP HS \d+ HOC SINH QR/)).toBeVisible();

    // Nhắc học phí: phụ huynh thử (chat giả 92xxxxxxxx) nhận ảnh mã QR kèm lời nhắc; tin được lưu vào lịch sử
    const [kid] = (await db.query<{ id: number }>('select id from students where full_name = $1', [KID])).rows;
    const [parent] = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH QR ${stamp}`, `07${stamp}88`])).rows;
    parentId = parent.id;
    await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', true)`, [kid.id, parent.id]);
    await db.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'PH QR E2E')`, [chatId, parent.id]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Nhắc' }).first().click();
    await expect(page.getByRole('status').filter({ hasText: KID })).toBeVisible();
    const [msg] = (await db.query<{ text: string }>(`select text from telegram_messages where chat_id = $1 and kind = 'tuition' order by id desc limit 1`, [chatId])).rows;
    expect(msg.text).toMatch(/^\[Ảnh mã QR\] ESL Center xin nhắc: học phí của Học sinh QR \d+ còn thiếu 2\.500\.000/);
    expect(msg.text).toContain('Vietcombank 0011001234567 · TRUNG TAM E2E');
  } finally {
    await db.query('delete from telegram_messages where chat_id = $1', [chatId]);
    await db.query('delete from telegram_chats where chat_id = $1', [chatId]);
    if (parentId) await db.query('delete from parents where id = $1', [parentId]);
    await db.query('update center_settings set bank_bin = $1, bank_account = $2, bank_account_name = $3 where id = 1', [before.bank_bin, before.bank_account, before.bank_account_name]);
    await db.query(`delete from students where class_id in (${stale})`);
    await db.query(`delete from classes where id in (${stale})`);
    await db.end();
  }
});

// Nhắc học phí tự động (cron): có tài khoản nhận học phí thì tin gửi kèm ảnh mã QR. Chỉ gửi tới chat giả (?chat=).
test('cron nhắc học phí gửi kèm ảnh mã QR', async ({ request }) => {
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const run = String(Date.now()).slice(-6);
  const cls = `QR-${run}`;
  const chatId = 9_210_000_000 + Number(run);
  const phone = `07${run}99`;
  const [before] = (await db.query<{ bank_bin: string; bank_account: string; bank_account_name: string; due_day: number }>('select bank_bin, bank_account, bank_account_name, due_day from center_settings where id = 1')).rows;
  const { phase } = tuitionPhase(new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10), before.due_day);
  test.skip(phase === null, 'Hôm nay không phải ngày nhắc học phí (trước hạn 3 ngày hoặc đã quá hạn)');
  try {
    await db.query(`update center_settings set bank_bin = '970436', bank_account = '0011001234567', bank_account_name = 'TRUNG TAM E2E' where id = 1`);
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [c] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E QR', $3, 'T6 · 09:00–10:00', 'T6', '09:00', '10:00', 1, 1800000, 'QR-P', 10) returning id`,
        [campus.id, cls, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01') returning id`, [`Bé cron ${run}`, `be cron ${run}`, c.id])).rows;
    const [parent] = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH cron ${run}`, phone])).rows;
    await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', true)`, [kid.id, parent.id]);
    await db.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'PH cron E2E')`, [chatId, parent.id]);

    const res = await request.get(`/api/cron/telegram?jobs=tuition&chat=${chatId}`, { headers: cronAuth() });
    expect(res.status()).toBe(200);
    const [msg] = (await db.query<{ text: string }>(`select text from telegram_messages where chat_id = $1 and kind = 'remind_tuition'`, [chatId])).rows;
    expect(msg.text).toMatch(/^\[Ảnh mã QR\] 💳 (NHẮC HỌC PHÍ|HỌC PHÍ QUÁ HẠN)/);
    expect(msg.text).toContain(`Bé cron ${run}`);
    expect(msg.text).toContain('Vietcombank 0011001234567 · TRUNG TAM E2E · 1.800.000');
  } finally {
    await db.query('update center_settings set bank_bin = $1, bank_account = $2, bank_account_name = $3 where id = 1', [before.bank_bin, before.bank_account, before.bank_account_name]);
    await db.query('delete from telegram_notification_log where chat_id = $1', [chatId]);
    await db.query('delete from telegram_messages where chat_id = $1', [chatId]);
    await db.query('delete from telegram_chats where chat_id = $1', [chatId]);
    await db.query('delete from parents where phone = $1', [phone]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [cls]);
    await db.query('delete from classes where name = $1', [cls]);
    await db.end();
  }
});
