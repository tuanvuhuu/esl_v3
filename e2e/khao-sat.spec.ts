import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { cronAuth, login } from './helpers';

// Khảo sát cuối khoá (37.14): lớp thử vừa học xong buổi cuối, cron gửi khảo sát (chỉ tới chat giả 922xxxxxxx),
// phụ huynh giả bấm sao và chọn học tiếp qua webhook, trang lớp hiện kết quả. Không chạm phụ huynh thật.
const stamp = String(Date.now()).slice(-6);
const CLS = `KS-${stamp}`;
const KID = `Bé khảo sát ${stamp}`;
const PHONE = `05${stamp}11`;
const chatId = 9_220_000_000 + Number(stamp);
const otherChat = chatId + 1;

test('khảo sát cuối khoá: cron gửi, phụ huynh chấm sao và chọn học tiếp, trang lớp hiện kết quả', async ({ page, request }) => {
  loadEnvLocal();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^KS-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
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
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E khảo sát', $3, 'T6 · 09:00–10:00', 'T6', '09:00', '10:00', 1, 1000000, 'KS-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    // Buổi cuối vừa kết thúc hôm qua
    await db.query(`insert into class_sessions (class_id, session_no, starts_at, ends_at, teacher_id, room, status) values ($1, 1, now() - interval '26 hours', now() - interval '25 hours', $2, 'KS-P', 'done')`, [cls.id, teacher.id]);
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [KID, `be khao sat ${stamp}`, cls.id])).rows;
    const [parent] = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH khảo sát ${stamp}`, PHONE])).rows;
    await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', true)`, [kid.id, parent.id]);
    await db.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'PH KS E2E'), ($3, null, 'Người lạ E2E')`, [chatId, parent.id, otherChat]);

    // Cron gửi khảo sát cho lớp vừa xong, chỉ tới chat giả; chạy lại không gửi lần hai
    for (let i = 0; i < 2; i++) expect((await request.get(`/api/cron/telegram?jobs=survey&chat=${chatId}`, { headers: cronAuth() })).status()).toBe(200);
    const sent = (await db.query<{ text: string }>(`select text from telegram_messages where chat_id = $1 and kind = 'survey' order by id`, [chatId])).rows;
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain(`Lớp ${CLS}`);
    expect(sent[0].text).toContain(KID);
    const [row] = (await db.query<{ id: number }>('select id from course_surveys where class_id = $1', [cls.id])).rows;

    // Người lạ bấm nút của dòng này: không ghi được
    await tap(otherChat, `sv:${row.id}:5`);
    expect((await db.query('select score from course_surveys where id = $1', [row.id])).rows[0].score).toBeNull();

    // Phụ huynh chấm 2 sao rồi chọn học tiếp
    await tap(chatId, `sv:${row.id}:2`);
    await tap(chatId, `svc:${row.id}:yes`);
    const [saved] = (await db.query<{ score: number; continue_choice: string }>('select score, continue_choice from course_surveys where id = $1', [row.id])).rows;
    expect(saved).toEqual({ score: 2, continue_choice: 'yes' });

    // Trang lớp: điểm trung bình, số đã chấm, tỉ lệ học tiếp, danh sách cần liên hệ
    await login(page);
    await page.goto(`/lop-hoc/${cls.id}`);
    const panel = page.locator('section, div').filter({ has: page.getByRole('heading', { name: 'Khảo sát cuối khoá' }) }).last();
    await expect(panel.getByText('2/5', { exact: true })).toBeVisible();
    await expect(panel.getByText('1/1', { exact: true })).toBeVisible();
    await expect(panel.getByText('100%', { exact: true })).toBeVisible();
    await expect(panel.getByRole('link', { name: KID })).toBeVisible();
  } finally {
    await db.query('delete from telegram_messages where chat_id = any($1)', [[chatId, otherChat]]);
    await db.query('delete from telegram_chats where chat_id = any($1)', [[chatId, otherChat]]);
    await db.query('delete from parents where phone = $1', [PHONE]);
    await db.query(`delete from students where class_id in (${stale})`);
    await db.query(`delete from classes where id in (${stale})`);
    await db.end();
  }
});
