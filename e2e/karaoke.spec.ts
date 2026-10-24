import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';
import { hashPassword } from '../src/lib/auth/password';

// Micro giả của Chromium cho phần học sinh đọc theo (đặt ở đầu file vì đổi tham số khởi động trình duyệt)
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] }, permissions: ['microphone'] });

// Karaoke đọc theo (35.7). Lớp thử ở Cơ sở test. Giáo viên soạn câu đọc to: tải giọng mẫu (tệp WAV 2,4 giây tạo trong test),
// chạm mốc từng từ theo giọng mẫu, lưu. Câu đọc to thứ hai không có giọng mẫu (máy đọc). Học sinh trên điện thoại bấm nghe mẫu:
// chữ sáng dần từng từ theo giọng mẫu, xong thì ghi âm đọc theo bằng micro giả và nộp.
const run = String(Date.now()).slice(-6);
const CLS = `KA-${run}`;
const EMAIL = `karaoke-${run}@hoc-sinh.local`;
const PASSWORD = `Karaoke-${run}-x`;
const SENTENCE = 'I can see a big bear';

// Tệp WAV đơn âm 8 kHz, tiếng bíp nhỏ, đủ để trình duyệt phát và đếm thời gian
function wav(seconds: number): Buffer {
  const rate = 8000;
  const n = Math.round(rate * seconds);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 2000), 44 + i * 2);
  return buf;
}

test('karaoke: giáo viên chạm mốc từng từ theo giọng mẫu; học sinh nghe chữ sáng dần rồi ghi âm đọc theo', async ({ page, browser }) => {
  test.setTimeout(180_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^KA-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from accounts where student_id in (select id from students where class_id in (${stale}))`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E karaoke', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'KA-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [`Bé karaoke ${run}`, `be karaoke ${run}`, cls.id])).rows;
    await db.query(`insert into accounts (full_name, email, role, status, password_hash, student_id) values ($1, $2, 'student', 'active', $3, $4)`, [`Bé karaoke ${run}`, EMAIL, await hashPassword(PASSWORD), kid.id]);
    await db.query(`insert into parent_consents (student_id, purpose, granted, channel, terms_version, child_agreed_at) values ($1, 'voice_teacher_review', true, 'staff', 'e2e', now())`, [kid.id]);
    const [asg] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + interval '3 days', 10) returning id`, [cls.id, `Đọc theo ${run}`])).rows;

    // Giáo viên soạn hai câu đọc to: câu 1 có giọng mẫu và mốc từng từ, câu 2 không có giọng mẫu
    await login(page);
    await page.goto(`/bai-tap/${asg.id}`);
    await page.getByRole('button', { name: 'Soạn câu hỏi' }).click();
    const editor = page.getByRole('dialog').last();
    for (const [n, text] of [[1, SENTENCE], [2, 'My cat is happy']] as const) {
      await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
      await editor.getByRole('radiogroup', { name: `Loại của câu ${n}` }).getByRole('radio', { name: /Đọc to/ }).click();
      await editor.getByLabel(`Nội dung câu ${n}`).fill('Read aloud.');
      await editor.getByPlaceholder('VD: This is my brother. He is three.').nth(n - 1).fill(text);
    }
    await editor.getByLabel('Tải tệp giọng mẫu cho câu 1').setInputFiles({ name: 'giong-mau.wav', mimeType: 'audio/wav', buffer: wav(2.4) });
    const k1 = editor.getByRole('group', { name: 'Mốc karaoke câu 1' });
    await expect(k1.getByText('Chữ đang sáng chia đều theo độ dài giọng mẫu.', { exact: false })).toBeVisible({ timeout: 30_000 });
    await expect(editor.getByRole('group', { name: 'Mốc karaoke câu 2' })).toContainText('Chưa có giọng mẫu');
    await k1.getByRole('button', { name: 'Chỉnh mốc từng từ' }).click();
    const words = SENTENCE.split(' ');
    for (let i = 0; i < words.length; i++) {
      await page.waitForTimeout(300);
      await k1.getByRole('button', { name: `Chạm mốc từ ${i + 1}` }).click();
    }
    await expect(k1.getByText('Đã chỉnh mốc từng từ theo giọng mẫu.')).toBeVisible();
    await editor.getByRole('button', { name: 'Lưu câu hỏi' }).click();
    await expectToast(page, /Đã lưu 2 câu hỏi/);
    const items = (await db.query<{ word_timings: string; model_audio_file_id: number | null; reference_text: string }>(`select word_timings, model_audio_file_id, reference_text from assignment_items where assignment_id = $1 order by position`, [asg.id])).rows;
    const timings = items[0].word_timings.split(',').map(Number);
    expect(timings).toHaveLength(words.length);
    for (let i = 1; i < timings.length; i++) expect(timings[i]).toBeGreaterThanOrEqual(timings[i - 1]);
    expect(timings.at(-1)! - timings[0]).toBeGreaterThan(500);
    expect(items[0].model_audio_file_id).not.toBeNull();
    expect(items[1]).toMatchObject({ word_timings: '', model_audio_file_id: null });

    // Học sinh trên điện thoại: câu đọc theo hiện theo thứ tự đã xáo, làm cả hai câu
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] })).newPage();
    await phone.goto('/dang-nhap');
    await phone.getByLabel('Email').fill(EMAIL);
    await phone.getByLabel('Mật khẩu').fill(PASSWORD);
    await phone.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await phone.waitForURL('**/cua-toi**');
    await phone.goto(`/cua-toi/${asg.id}`);
    for (let q = 0; q < 2; q++) {
      const line = phone.getByLabel('Câu đọc theo');
      await expect(line).toBeVisible();
      const firstWord = line.locator('[data-state]').first();
      await expect(firstWord).toHaveAttribute('data-state', 'todo');
      await phone.getByRole('button', { name: 'Nghe mẫu và đọc theo' }).click();
      // Chữ sáng dần: có lúc một từ đang sáng; đọc xong thì mọi từ đã đọc và nhắc con bấm micro
      if ((await line.textContent())?.includes('bear')) await expect(line.locator('[data-state="active"]')).toHaveCount(1, { timeout: 5_000 });
      await expect(phone.getByRole('status').filter({ hasText: 'Giờ con bấm micro để đọc theo nhé!' })).toBeVisible({ timeout: 15_000 });
      await expect(line.locator('[data-state="todo"]')).toHaveCount(0);
      expect(await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      // Ghi âm đọc theo bằng micro giả
      await phone.getByRole('button', { name: 'Bấm để nói' }).click();
      await phone.waitForTimeout(1200);
      await phone.getByRole('button', { name: 'Dừng ghi âm' }).click();
      await phone.getByRole('button', { name: 'Dùng bản này' }).click();
      await expect(phone.getByText('Bấm để nói lại')).toBeVisible({ timeout: 30_000 });
      if (q === 0) await phone.getByRole('button', { name: /Tiếp tục/ }).click();
    }
    await phone.getByRole('button', { name: /Xong bài/ }).click();
    await expect(phone.getByText('Cô giáo sẽ chấm phần nói và viết rồi gửi nhận xét cho con.')).toBeVisible({ timeout: 30_000 });
    const files = (await db.query<{ file_id: number | null }>(`select sis.file_id from submission_item_scores sis join assignment_submissions sub on sub.id = sis.submission_id where sub.assignment_id = $1 and sub.student_id = $2`, [asg.id, kid.id])).rows;
    expect(files.filter((f) => f.file_id !== null)).toHaveLength(2);
    await phone.context().close();
  } finally {
    await db.query('delete from accounts where email = $1', [EMAIL]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.end();
  }
});
