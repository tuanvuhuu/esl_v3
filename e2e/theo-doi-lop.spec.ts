import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { cronAuth, login } from './helpers';
import { hashPassword } from '../src/lib/auth/password';

// Bảng theo dõi lớp (35.20). Lớp thử ở Cơ sở test, 3 em (An, Bình, Chi); giáo viên thử có chat Telegram giả.
// Bài 1 (quá hạn 3 ngày): trắc nghiệm, điền chỗ trống, câu nói. An nộp 3 ngày trước (sai trắc nghiệm, có ghi âm, chờ chấm);
// Bình đã chấm (sai điền chỗ trống); Chi chưa nộp. Bài 2 (còn 2 ngày): chỉ Bình nộp.
// Mong đợi: chưa làm Chi 2 bài, An 1 bài; hai câu 1/2 em sai kèm đáp án; từ hay quên cat (2 em), dog (1 em);
// bài nói của An chờ 3 ngày, bấm mở thẳng hộp chấm của An; bot nhắc chấm (chỉ gửi chat giả) ghi rõ có câu nói.
const run = String(Date.now()).slice(-6);
const CLS = `TD-${run}`;
const CHAT = 9_500_000_000 + Number(run);

test('theo dõi lớp: em chưa làm, câu và từ hay sai, bài nói chờ chấm mở thẳng màn chấm; bot nhắc chấm bài nói', async ({ page }) => {
  test.setTimeout(120_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^TD-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  const fileIds: number[] = [];
  let teacherId = 0;
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    teacherId = (await db.query<{ id: number }>(`insert into teachers (name, subject) values ($1, 'E2E') returning id`, [`GV theo dõi ${run}`])).rows[0].id;
    await db.query(`insert into teacher_campuses (teacher_id, campus_id) values ($1, $2)`, [teacherId, campus.id]);
    const [acc] = (await db.query<{ id: number }>(`insert into accounts (full_name, email, role, status, password_hash, teacher_id) values ($1, $2, 'teacher', 'active', $3, $4) returning id`, [`GV theo dõi ${run}`, `gv-td-${run}@esl.local`, await hashPassword(`Gv-${run}-x`), teacherId])).rows;
    await db.query(`insert into telegram_chats (chat_id, account_id, display_name) values ($1, $2, 'E2E GV')`, [CHAT, acc.id]);
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E theo dõi', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'TD-P', 10) returning id`,
        [campus.id, CLS, teacherId],
      )
    ).rows;
    const kid = async (name: string) => (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01') returning id`, [name, name.toLowerCase(), cls.id])).rows[0].id;
    const [an, binh, chi] = [await kid(`An ${run}`), await kid(`Bình ${run}`), await kid(`Chi ${run}`)];

    const a1 = (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() - interval '3 days', 10) returning id`, [cls.id, `Bài 1 ${run}`])).rows[0].id;
    const a2 = (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + interval '2 days', 10) returning id`, [cls.id, `Bài 2 ${run}`])).rows[0].id;
    const choice = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points) values ($1, 1, 'reading', 'choice', 'Which one is a fruit?', 3) returning id`, [a1])).rows[0].id;
    const opts = (await db.query<{ id: number }>(`insert into assignment_item_options (item_id, position, label, is_correct) values ($1, 1, 'chair', false), ($1, 2, 'apple', true) returning id`, [choice])).rows;
    const gap = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points, reference_text) values ($1, 2, 'reading', 'gap_fill', 'I ___ a cat.', 3, 'have') returning id`, [a1])).rows[0].id;
    const speak = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points, reference_text) values ($1, 3, 'speaking', 'speak_repeat', 'Listen and repeat.', 4, 'I have a cat.') returning id`, [a1])).rows[0].id;
    fileIds.push((await db.query<{ id: number }>(`insert into uploaded_files (storage_key, original_name, mime_type, size_bytes) values ($1, 'noi.webm', 'audio/webm', 100) returning id`, [`e2e-td-${run}`])).rows[0].id);

    const sub = async (asg: number, student: number, status: string, at: string) =>
      (await db.query<{ id: number }>(`insert into assignment_submissions (assignment_id, student_id, status, submitted_at) values ($1, $2, $3, now() - $4::interval) returning id`, [asg, student, status, at])).rows[0].id;
    const sAn = await sub(a1, an, 'submitted', '3 days 2 hours');
    await db.query(`insert into submission_item_scores (submission_id, item_id, selected_option_id) values ($1, $2, $3)`, [sAn, choice, opts[0].id]);
    await db.query(`insert into submission_item_scores (submission_id, item_id, answer_text) values ($1, $2, 'have')`, [sAn, gap]);
    await db.query(`insert into submission_item_scores (submission_id, item_id, file_id) values ($1, $2, $3)`, [sAn, speak, fileIds[0]]);
    const sBinh = await sub(a1, binh, 'graded', '2 days');
    await db.query(`insert into submission_item_scores (submission_id, item_id, selected_option_id) values ($1, $2, $3)`, [sBinh, choice, opts[1].id]);
    await db.query(`insert into submission_item_scores (submission_id, item_id, answer_text) values ($1, $2, 'has')`, [sBinh, gap]);
    await sub(a2, binh, 'submitted', '1 hour');

    // Hộp từ: cat bị An và Chi chọn sai khi ôn, dog chỉ An
    const card = JSON.stringify({ due: new Date().toISOString() });
    for (const [student, word, wrong] of [[an, 'cat', 2], [chi, 'cat', 1], [an, 'dog', 1], [binh, 'bird', 0]] as const) {
      await db.query(`insert into word_reviews (student_id, word_key, word, card, due, wrong_count) values ($1, $2, $2, $3::jsonb, now(), $4)`, [student, word, card, wrong]);
    }

    await login(page);
    await page.goto(`/lop-hoc/${cls.id}`);
    const panel = page.getByRole('region', { name: 'Theo dõi lớp' });
    await expect(panel.getByRole('heading', { name: /Chưa làm bài/ })).toContainText('(2/3 em)');
    const missing = panel.getByRole('list', { name: 'Em chưa làm bài' }).locator(':scope > li');
    await expect(missing).toHaveCount(2);
    await expect(missing.nth(0)).toContainText(`Chi ${run}`);
    await expect(missing.nth(0)).toContainText('2 bài');
    await expect(missing.nth(0).getByText('Quá hạn')).toHaveCount(1);
    await expect(missing.nth(1)).toContainText(`An ${run}`);
    await expect(missing.nth(1)).toContainText(`Bài 2 ${run}`);

    const hard = panel.getByRole('list', { name: 'Câu hay sai' }).getByRole('listitem');
    await expect(hard).toHaveCount(2);
    await expect(panel.getByRole('list', { name: 'Câu hay sai' })).toContainText('Which one is a fruit?');
    await expect(panel.getByRole('list', { name: 'Câu hay sai' })).toContainText('Đáp án: apple');
    await expect(panel.getByRole('list', { name: 'Câu hay sai' })).toContainText('Đáp án: have');
    await expect(panel.getByText('1/2 em sai')).toHaveCount(2);
    const words = panel.getByRole('list', { name: 'Từ hay quên' }).getByRole('listitem');
    await expect(words).toHaveText([/cat · 2 em/, /dog · 1 em/]);

    const speaking = panel.getByRole('list', { name: 'Bài nói chờ chấm' }).getByRole('listitem');
    await expect(speaking).toHaveCount(1);
    await expect(speaking.first()).toContainText('Chờ 3 ngày');
    await expect(speaking.first()).toContainText('1 câu nói');

    // Điện thoại: không tràn ngang
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.setViewportSize({ width: 1280, height: 800 });

    // Bấm bài nói chờ chấm: mở thẳng hộp chấm bài của An
    await speaking.first().getByRole('link', { name: `Chấm bài An ${run}` }).click();
    await page.waitForURL(`**/bai-tap/${a1}?hs=${an}`);
    await expect(page.getByRole('dialog', { name: `Bài làm của An ${run}` })).toBeVisible();

    // Bot nhắc chấm (chỉ gửi chat giả của giáo viên thử): ghi rõ số bài có câu nói
    const res = await page.request.get(`/api/cron/telegram?jobs=grading&chat=${CHAT}`, { headers: cronAuth() });
    expect(res.status()).toBe(200);
    const sent = (await db.query<{ text: string }>(`select text from telegram_messages where chat_id = $1 and direction = 'out' and kind = 'remind_grading'`, [CHAT])).rows;
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain(`Bài 1 ${run}`);
    expect(sent[0].text).toContain('🎙️ 1 bài có câu nói');
  } finally {
    await db.query('delete from telegram_messages where chat_id = $1', [CHAT]);
    await db.query('delete from telegram_chats where chat_id = $1', [CHAT]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    if (teacherId) {
      await db.query('delete from accounts where teacher_id = $1', [teacherId]);
      await db.query('delete from teachers where id = $1', [teacherId]);
    }
    if (fileIds.length) await db.query('delete from uploaded_files where id = any($1)', [fileIds]);
    await db.end();
  }
});
