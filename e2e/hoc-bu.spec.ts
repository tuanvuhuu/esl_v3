import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Học bù (37.12): hai lớp thử cùng khoá ở Cơ sở test. Học sinh lớp A nghỉ có phép, giáo vụ xếp học bù buổi của lớp B;
// phụ huynh (chat giả 923xxxxxxx) đổi buổi trên bot; buổi bù có em trong danh sách điểm danh và lưu được.
const stamp = String(Date.now()).slice(-6);
const A = `HB-A${stamp}`;
const B = `HB-B${stamp}`;
const COURSE = `E2E học bù ${stamp}`;
const KID = `Bé học bù ${stamp}`;
const PHONE = `04${stamp}33`;
const chatId = 9_230_000_000 + Number(stamp);
const stranger = chatId + 1;

test('học bù: giáo vụ xếp, phụ huynh đổi trên bot, buổi bù có trong điểm danh', async ({ page, request }) => {
  loadEnvLocal();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^HB-[AB][0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from attendance where class_id in (${stale})`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  const tap = (chat: number, data: string) =>
    request.post('/api/telegram/webhook', {
      headers: { 'x-telegram-bot-api-secret-token': secret },
      data: { update_id: Date.now(), callback_query: { id: `cb${Date.now()}${Math.random()}`, from: { id: chat }, message: { message_id: 7, chat: { id: chat } }, data } },
    });
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const mkClass = async (name: string) =>
      (
        await db.query<{ id: number }>(
          `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
           values ($1, $2, $3, $4, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 2, 1000000, 'HB-P', 10) returning id`,
          [campus.id, name, COURSE, teacher.id],
        )
      ).rows[0].id;
    const classA = await mkClass(A);
    const classB = await mkClass(B);
    const mkSession = async (classId: number, no: number, days: number, room: string) =>
      (
        await db.query<{ id: number }>(
          `insert into class_sessions (class_id, session_no, starts_at, ends_at, teacher_id, room) values ($1, $2, date_trunc('hour', now()) + make_interval(days => $3), date_trunc('hour', now()) + make_interval(days => $3, hours => 1), $4, $5) returning id`,
          [classId, no, days, teacher.id, room],
        )
      ).rows[0].id;
    const a1 = await mkSession(classA, 1, 2, 'P-A');
    const b1 = await mkSession(classB, 1, 3, 'P-B');
    const b2 = await mkSession(classB, 2, 5, 'P-B');
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01') returning id`, [KID, `be hoc bu ${stamp}`, classA])).rows;
    const [parent] = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH học bù ${stamp}`, PHONE])).rows;
    await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', true)`, [kid.id, parent.id]);
    await db.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'PH HB E2E'), ($3, null, 'Người lạ HB')`, [chatId, parent.id, stranger]);
    const [leave] = (await db.query<{ id: number }>(`insert into leave_requests (student_id, session_id, status, reason) values ($1, $2, 'approved', 'Ốm') returning id`, [kid.id, a1])).rows;

    // Giáo vụ xếp học bù buổi b1 ở màn Đơn nghỉ
    await login(page);
    await page.goto(`/don-nghi?f=approved&cls=${classA}`);
    await page.getByRole('button', { name: 'Xếp học bù' }).first().click();
    const dlg = page.getByRole('dialog', { name: `Xếp học bù · ${KID}` });
    await expect(dlg.getByText(`lớp ${B}`).first()).toBeVisible();
    await dlg.getByRole('button', { name: 'Chọn' }).first().click();
    await expectToast(page, new RegExp(`Đã xếp học bù cho ${KID}: lớp ${B}`));
    const booked = async () => (await db.query<{ session_id: number }>('select session_id from makeup_bookings where leave_request_id = $1', [leave.id])).rows[0]?.session_id;
    expect(await booked()).toBe(b1);
    await expect(page.getByText(new RegExp(`Học bù: lớp ${B}`)).locator("visible=true").first()).toBeVisible();
    await expect.poll(async () => (await db.query(`select 1 from telegram_messages where chat_id = $1 and text like '%HỌC BÙ%'`, [chatId])).rowCount).toBe(1);

    // Bot: người lạ không đổi được; phụ huynh xem danh sách và đổi sang b2
    await tap(stranger, `mks:${leave.id}:${b2}`);
    expect(await booked()).toBe(b1);
    await tap(chatId, `mk:${leave.id}`);
    await expect.poll(async () => (await db.query(`select 1 from telegram_messages where chat_id = $1 and text like '%Chọn buổi học bù%'`, [chatId])).rowCount).toBe(1);
    await tap(chatId, `mks:${leave.id}:${b2}`);
    await expect.poll(booked).toBe(b2);

    // Buổi b2 bắt đầu: em có trong danh sách điểm danh lớp B với nhãn Học bù, lưu được
    await db.query(`update class_sessions set starts_at = now() - interval '10 minutes', ends_at = now() + interval '50 minutes' where id = $1`, [b2]);
    await page.goto(`/diem-danh?cls=${classB}&s=${b2}`);
    await expect(page.getByText(`Học bù · từ lớp ${A}`)).toBeVisible();
    await page.getByRole('group', { name: `Điểm danh ${KID}` }).getByRole('button', { name: 'Có mặt' }).click();
    await page.getByRole('button', { name: 'Lưu điểm danh' }).first().click();
    await expectToast(page, /Đã lưu điểm danh/);
    const [att] = (await db.query<{ mark: string; class_id: number }>(`select mark, class_id from attendance where student_id = $1 and class_id = $2`, [kid.id, classB])).rows;
    expect(att).toEqual({ mark: 'present', class_id: classB });
  } finally {
    await db.query('delete from telegram_messages where chat_id = any($1)', [[chatId, stranger]]);
    await db.query('delete from telegram_chats where chat_id = any($1)', [[chatId, stranger]]);
    await db.query('delete from parents where phone = $1', [PHONE]);
    await db.query(`delete from attendance where class_id in (${stale})`);
    await db.query(`delete from students where class_id in (${stale})`);
    await db.query(`delete from classes where id in (${stale})`);
    await db.end();
  }
});
