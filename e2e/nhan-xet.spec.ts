import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';
import { hashPassword } from '../src/lib/auth/password';

// Micro giả của Chromium để ghi giọng mẫu (đặt ở đầu file vì đổi tham số khởi động trình duyệt)
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, permissions: ['microphone'] });

// Gửi nhận xét bài nói cho phụ huynh qua Telegram (35.11). Lớp thử ở Cơ sở test; phụ huynh và một quản trị phụ dùng chat giả
// (không phải người thật). Giáo viên đánh dấu lỗi có giọng mẫu, chấm sao, ghi lời khen rồi bấm "Lưu và gửi":
// phụ huynh nhận tin chữ (lời khen, sao, lỗi, chữ ký) và tin âm thanh; quản trị phụ nhận bản sao; gửi lại cùng nội dung
// thì không gửi trùng; phụ huynh gõ /nhanxet thì bot trả nhận xét.
const run = String(Date.now()).slice(-6);
const CLS = `NX-${run}`;
const KID = `Bé nhận xét ${run}`;
const PARENT_CHAT = 9_600_000_000 + Number(run);
const ADMIN_CHAT = 9_610_000_000 + Number(run);

test('nhận xét bài nói: gửi phụ huynh kèm giọng mẫu và bản sao quản trị, không gửi trùng; /nhanxet đọc lại', async ({ page }) => {
  test.setTimeout(150_000);
  loadEnvLocal();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const out = async (chatId: number, kind?: string) =>
    (await db.query<{ text: string; kind: string }>(`select text, kind from telegram_messages where chat_id = $1 and direction = 'out' ${kind ? 'and kind = $2' : ''} order by id`, kind ? [chatId, kind] : [chatId])).rows;
  let parentId = 0;
  let fileId = 0;
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E nhận xét', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'NX-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01') returning id`, [KID, `be nhan xet ${run}`, cls.id])).rows;
    parentId = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH nhận xét ${run}`, `08${run}61`])).rows[0].id;
    await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', true)`, [kid.id, parentId]);
    await db.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'E2E PH')`, [PARENT_CHAT, parentId]);
    // Quản trị phụ (chat giả) để nhận bản sao; người gửi là admin đăng nhập nên không nhận bản sao của chính mình
    const [admin2] = (await db.query<{ id: number }>(`insert into accounts (full_name, email, role, status, password_hash) values ($1, $2, 'admin', 'active', $3) returning id`, [`QT phụ ${run}`, `qt-phu-${run}@esl.local`, await hashPassword(`Qt-${run}-x`)])).rows;
    await db.query(`insert into telegram_chats (chat_id, account_id, display_name) values ($1, $2, 'E2E QT')`, [ADMIN_CHAT, admin2.id]);

    const [asg] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + interval '3 days', 10) returning id`, [cls.id, `Bài nói ${run}`])).rows;
    const [speak] = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points, reference_text) values ($1, 1, 'speaking', 'speak_repeat', 'Listen and repeat.', 10, 'I have three cats.') returning id`, [asg.id])).rows;
    fileId = (await db.query<{ id: number }>(`insert into uploaded_files (storage_key, original_name, mime_type, size_bytes) values ($1, 'bai-noi.webm', 'audio/webm', 1200) returning id`, [`e2e-nx-${run}`])).rows[0].id;
    const [sub] = (await db.query<{ id: number }>(`insert into assignment_submissions (assignment_id, student_id, status, submitted_at) values ($1, $2, 'submitted', now()) returning id`, [asg.id, kid.id])).rows;
    await db.query(`insert into submission_item_scores (submission_id, item_id, file_id) values ($1, $2, $3)`, [sub.id, speak.id, fileId]);

    await login(page);
    await page.goto(`/bai-tap/${asg.id}`);
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    const dlg = page.getByRole('dialog', { name: `Bài làm của ${KID}` });

    // Lỗi âm th có giọng mẫu ghi bằng micro giả, cần nói lại
    await dlg.getByRole('button', { name: /Đánh dấu lỗi tại/ }).click();
    await dlg.getByRole('button', { name: 'Loại lỗi' }).click();
    await page.getByRole('option', { name: 'Âm /θ/ /ð/ (th)' }).click();
    await dlg.getByLabel('Nói đúng là').fill('three');
    await dlg.getByLabel('Cần nói lại câu này').check();
    await dlg.getByRole('button', { name: 'Ghi giọng mẫu' }).click();
    await expect(dlg.getByText(/Dừng 0:01/)).toBeVisible({ timeout: 5_000 });
    await dlg.getByRole('button', { name: 'Dừng ghi giọng mẫu' }).click();
    await expect(dlg.getByLabel('Giọng mẫu đã ghi')).toBeVisible({ timeout: 30_000 });
    await dlg.getByRole('button', { name: 'Thêm lỗi' }).click();
    await expectToast(page, 'Đã đánh dấu lỗi: Âm /θ/ /ð/ (th)');

    // Chấm sao, lời khen, rồi lưu và gửi
    const rubric = dlg.getByRole('group', { name: 'Tiêu chí câu 1' });
    await rubric.getByRole('button', { name: 'Phát âm 2 sao' }).click();
    await rubric.getByRole('button', { name: 'Trôi chảy 3 sao' }).click();
    await rubric.getByRole('button', { name: 'Hoàn thành yêu cầu 3 sao' }).click();
    await rubric.getByLabel('Điều con làm tốt câu 1').fill('Con nói to và tự tin.');
    await dlg.getByRole('button', { name: 'Lưu và gửi nhận xét bài nói cho phụ huynh' }).click();
    await expectToast(page, /Đã gửi nhận xét bài nói cho 1 phụ huynh qua Telegram/);

    const [msg] = await out(PARENT_CHAT, 'speaking_feedback');
    expect(msg.text).toContain(`NHẬN XÉT BÀI NÓI của em ${KID} (lớp ${CLS})`);
    expect(msg.text).toContain('👍 Điều con làm tốt: Con nói to và tự tin.');
    expect(msg.text).toContain('Phát âm ⭐⭐☆ · Trôi chảy ⭐⭐⭐ · Hoàn thành yêu cầu ⭐⭐⭐');
    expect(msg.text).toContain('Âm /θ/ /ð/ (th) ở giây');
    expect(msg.text).toContain('nói đúng: "three"');
    expect(msg.text).toContain('🔁 Thầy/Cô đề nghị con nói lại câu này');
    expect(msg.text).toContain('🔊 Giọng mẫu của Thầy/Cô gửi kèm bên dưới.');
    expect(msg.text).toMatch(/— .+ESL Center|— Thầy\/Cô .+, GV lớp /);
    const audio = await out(PARENT_CHAT, 'speaking_model');
    expect(audio).toHaveLength(1);
    expect(audio[0].text).toMatch(/^\[Âm thanh: .+\] 🔊 Giọng mẫu câu 1/);
    const copy = await out(ADMIN_CHAT, 'speaking_copy');
    expect(copy).toHaveLength(1);
    expect(copy[0].text).toContain(`BẢN SAO:`);
    expect(copy[0].text).toContain(`phụ huynh em ${KID}`);

    // Gửi lại cùng nội dung: báo đã gửi, không có tin mới
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    await dlg.getByRole('button', { name: 'Lưu và gửi nhận xét bài nói cho phụ huynh' }).click();
    await expectToast(page, /đã gửi phụ huynh rồi/);
    expect(await out(PARENT_CHAT, 'speaking_feedback')).toHaveLength(1);
    expect(await out(PARENT_CHAT, 'speaking_model')).toHaveLength(1);

    // Phụ huynh gõ /nhanxet: bot trả nhận xét bài nói
    const res = await page.request.post('/api/telegram/webhook', {
      headers: { 'x-telegram-bot-api-secret-token': secret },
      data: { update_id: Date.now(), message: { message_id: 1, chat: { id: PARENT_CHAT, type: 'private' }, from: { id: PARENT_CHAT, first_name: 'E2E', is_bot: false }, text: '/nhanxet' } },
    });
    expect(res.status()).toBe(200);
    const replies = await out(PARENT_CHAT, 'command');
    expect(replies.at(-1)?.text).toContain('NHẬN XÉT BÀI NÓI');
    expect(replies.at(-1)?.text).toContain('Con nói to và tự tin.');
  } finally {
    await db.query('delete from telegram_messages where chat_id = any($1)', [[PARENT_CHAT, ADMIN_CHAT]]);
    await db.query('delete from telegram_notification_log where chat_id = any($1)', [[PARENT_CHAT, ADMIN_CHAT]]);
    await db.query('delete from telegram_chats where chat_id = any($1)', [[PARENT_CHAT, ADMIN_CHAT]]);
    await db.query(`delete from accounts where email = $1`, [`qt-phu-${run}@esl.local`]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    if (parentId) await db.query('delete from parents where id = $1', [parentId]);
    if (fileId) await db.query('delete from uploaded_files where id = $1', [fileId]);
    await db.end();
  }
});
