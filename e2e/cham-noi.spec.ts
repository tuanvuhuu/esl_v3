import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';
import { hashPassword } from '../src/lib/auth/password';

// Micro giả của Chromium cho vòng nói lại (đặt ở đầu file vì đổi tham số khởi động trình duyệt)
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, permissions: ['microphone'] });

// Chấm bài nói (35.8) và lỗi mất bài khi lưu chấm (E-085). Lớp thử ở Cơ sở test, bài có một câu nói và một câu chọn tranh,
// học sinh đã nộp bản ghi âm và đáp án chọn tranh. Giáo viên đánh dấu lỗi (thêm, sửa, xoá) rồi lưu điểm:
// bản ghi âm và đáp án của học sinh phải còn nguyên.
const stamp = String(Date.now()).slice(-6);
const CLS = `CN-${stamp}`;
const KID = `Bé chấm nói ${stamp}`;

test('chấm bài nói: đánh dấu lỗi theo mốc giây; lưu điểm không làm mất bản ghi âm và đáp án của học sinh', async ({ page }) => {
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^CN-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  let fileId = 0;
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E chấm nói', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'CN-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [KID, `be cham noi ${stamp}`, cls.id])).rows;
    const [asg] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + interval '3 days', 10) returning id`, [cls.id, `Bài nói ${stamp}`])).rows;
    const [speak] = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points, reference_text) values ($1, 1, 'speaking', 'speak_repeat', 'Listen and repeat.', 5, 'I have three cats.') returning id`, [asg.id])).rows;
    const [pic] = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points) values ($1, 2, 'listening', 'picture_choice', 'Choose the cat.', 5) returning id`, [asg.id])).rows;
    const opts = (await db.query<{ id: number }>(`insert into assignment_item_options (item_id, position, label, is_correct) values ($1, 1, 'cat', true), ($1, 2, 'dog', false) returning id`, [pic.id])).rows;
    fileId = (await db.query<{ id: number }>(`insert into uploaded_files (storage_key, original_name, mime_type, size_bytes) values ($1, 'bai-noi-cau-1.webm', 'audio/webm', 1200) returning id`, [`e2e-cham-noi-${stamp}`])).rows[0].id;
    const [sub] = (await db.query<{ id: number }>(`insert into assignment_submissions (assignment_id, student_id, status, submitted_at) values ($1, $2, 'submitted', now()) returning id`, [asg.id, kid.id])).rows;
    await db.query(`insert into submission_item_scores (submission_id, item_id, file_id) values ($1, $2, $3)`, [sub.id, speak.id, fileId]);
    await db.query(`insert into submission_item_scores (submission_id, item_id, selected_option_id) values ($1, $2, $3)`, [sub.id, pic.id, opts[0].id]);

    await login(page);
    await page.goto(`/bai-tap/${asg.id}`);
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    const dlg = page.getByRole('dialog', { name: `Bài làm của ${KID}` });
    await expect(dlg.getByLabel('Bài nói câu 1')).toBeVisible();

    // Thêm lỗi: mất âm cuối, nói đúng "cats", cần nói lại
    await dlg.getByRole('button', { name: /Đánh dấu lỗi tại/ }).click();
    await dlg.getByRole('button', { name: 'Loại lỗi' }).click();
    await page.getByRole('option', { name: 'Mất âm cuối' }).click();
    await dlg.getByLabel('Nói đúng là').fill('cats');
    await dlg.getByLabel('Cần nói lại câu này').check();
    await dlg.getByRole('button', { name: 'Thêm lỗi' }).click();
    await expectToast(page, 'Đã đánh dấu lỗi: Mất âm cuối');
    const marks = dlg.getByRole('list', { name: 'Lỗi đã đánh dấu câu 1' });
    await expect(marks.getByText('Nói lại câu này')).toBeVisible();

    // Sửa: đổi sang lỗi âm th, chữ đúng three
    await marks.getByRole('button', { name: /Sửa lỗi tại/ }).click();
    await dlg.getByRole('button', { name: 'Loại lỗi' }).click();
    await page.getByRole('option', { name: 'Âm /θ/ /ð/ (th)' }).click();
    await dlg.getByLabel('Nói đúng là').fill('three');
    await dlg.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, 'Đã sửa lỗi đã đánh dấu');
    const [row] = (await db.query<{ error_type: string; correct_text: string; redo: boolean }>('select error_type, correct_text, redo from speaking_feedback where submission_id = $1', [sub.id])).rows;
    expect(row).toEqual({ error_type: 'th', correct_text: 'three', redo: true });

    // Chấm theo tiêu chí (35.9): học sinh chưa có ngày sinh nên chấm sao; thiếu "Điều con làm tốt" thì không lưu được
    const rubric = dlg.getByRole('group', { name: 'Tiêu chí câu 1' });
    await rubric.getByRole('button', { name: 'Phát âm 3 sao' }).click();
    await rubric.getByRole('button', { name: 'Trôi chảy 2 sao' }).click();
    await rubric.getByRole('button', { name: 'Hoàn thành yêu cầu 3 sao' }).click();
    await expect(rubric.getByText('Quy ra 4/5 điểm')).toBeVisible(); // 8/9 × 5 ≈ 4
    await expect(dlg.getByLabel('Điểm câu 1')).toHaveValue('4');
    await dlg.getByRole('button', { name: 'Lưu bài làm' }).click();
    await expect(dlg.getByText(/ghi "Điều con làm tốt"/)).toBeVisible();
    await rubric.getByLabel('Điều con làm tốt câu 1').fill('Con nói to và rõ cả câu.');
    // Lưu điểm câu nói: bản ghi âm và đáp án chọn tranh vẫn còn (E-085)
    await dlg.getByRole('button', { name: 'Lưu bài làm' }).click();
    await expectToast(page, /Đã lưu/);
    const [assessed] = (await db.query<{ scale: string; pronunciation: number; fluency: number; task: number; praise: string }>('select scale, pronunciation, fluency, task, praise from speaking_assessments where submission_id = $1', [sub.id])).rows;
    expect(assessed).toEqual({ scale: 'stars', pronunciation: 3, fluency: 2, task: 3, praise: 'Con nói to và rõ cả câu.' });
    const kept = (await db.query<{ item_id: number; file_id: number | null; selected_option_id: number | null; points: number | null }>('select item_id, file_id, selected_option_id, points from submission_item_scores where submission_id = $1 order by item_id', [sub.id])).rows;
    expect(kept.find((k) => k.item_id === speak.id)).toMatchObject({ file_id: fileId, points: 4 });
    expect(kept.find((k) => k.item_id === pic.id)).toMatchObject({ selected_option_id: opts[0].id });

    // Xoá lỗi qua hộp xác nhận
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    await dlg.getByRole('list', { name: 'Lỗi đã đánh dấu câu 1' }).getByRole('button', { name: /Xoá lỗi tại/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá lỗi' }).click();
    await expectToast(page, 'Đã xoá lỗi đã đánh dấu');
    expect((await db.query('select 1 from speaking_feedback where submission_id = $1', [sub.id])).rowCount).toBe(0);
  } finally {
    await db.query(`delete from students where class_id in (${stale})`);
    await db.query(`delete from classes where id in (${stale})`);
    if (fileId) await db.query('delete from uploaded_files where id = $1', [fileId]);
    await db.end();
  }
});

// Vòng chấm, nói lại, chấm lại (35.10): giáo viên đánh dấu "nói lại"; học sinh đăng nhập thấy nhận xét theo mốc giây,
// ghi âm lại đúng câu đó (micro giả của Chromium); giáo viên thấy bản cũ cạnh bản mới; lưu chấm không làm mất bản cũ.
test.describe('nói lại câu bị đánh dấu', () => {
  test('học sinh xem lỗi theo mốc giây, nói lại; giáo viên nghe bản cũ cạnh bản mới', async ({ page, browser }) => {
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const run = String(Date.now()).slice(-6);
    const cls = `CN-${run}`;
    const kidName = `Bé nói lại ${run}`;
    const email = `noi-lai-${run}@hoc-sinh.local`;
    const password = `NoiLai-${run}-x`;
    let fileId = 0;
    try {
      const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
      const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
      const [c] = (
        await db.query<{ id: number }>(
          `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
           values ($1, $2, 'E2E nói lại', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'CN-P', 10) returning id`,
          [campus.id, cls, teacher.id],
        )
      ).rows;
      const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01') returning id`, [kidName, `be noi lai ${run}`, c.id])).rows;
      await db.query(`insert into accounts (full_name, email, role, status, password_hash, student_id) values ($1, $2, 'student', 'active', $3, $4)`, [kidName, email, await hashPassword(password), kid.id]);
      await db.query(`insert into parent_consents (student_id, purpose, granted, channel, terms_version, child_agreed_at) values ($1, 'voice_teacher_review', true, 'staff', 'e2e', now())`, [kid.id]);
      const [asg] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + interval '3 days', 10) returning id`, [c.id, `Nói lại ${run}`])).rows;
      const [speak] = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points, reference_text, max_seconds) values ($1, 1, 'speaking', 'speak_repeat', 'Listen and repeat.', 10, 'I have three cats.', 3) returning id`, [asg.id])).rows;
      fileId = (await db.query<{ id: number }>(`insert into uploaded_files (storage_key, original_name, mime_type, size_bytes) values ($1, 'bai-noi-cu.webm', 'audio/webm', 1200) returning id`, [`e2e-noi-lai-${run}`])).rows[0].id;
      const [sub] = (await db.query<{ id: number }>(`insert into assignment_submissions (assignment_id, student_id, status, submitted_at, score) values ($1, $2, 'graded', now(), 5) returning id`, [asg.id, kid.id])).rows;
      await db.query(`insert into submission_item_scores (submission_id, item_id, file_id, points) values ($1, $2, $3, 5)`, [sub.id, speak.id, fileId]);
      await db.query(
        `insert into speaking_feedback (submission_id, item_id, at_ms, error_type, correct_text, redo) values ($1, $2, 1500, 'th', 'three', true), ($1, $2, 600, 'final_sound', 'have', false), ($1, $2, 2400, 'intonation', '', false)`,
        [sub.id, speak.id],
      );
      await db.query(`insert into speaking_assessments (submission_id, item_id, scale, pronunciation, fluency, task, praise) values ($1, $2, 'stars', 2, 3, 3, 'Con nói đủ câu, rất tự tin.')`, [sub.id, speak.id]);

      // Học sinh đăng nhập, mở bài: thấy lỗi theo mốc giây và ghi âm lại
      const kidPage = await (await browser.newContext({ permissions: ['microphone'] })).newPage();
      await kidPage.goto('/dang-nhap');
      await kidPage.getByLabel('Email').fill(email);
      await kidPage.getByLabel('Mật khẩu').fill(password);
      await kidPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await kidPage.waitForURL('**/cua-toi**');
      await kidPage.goto(`/cua-toi/${asg.id}`);
      const fb = kidPage.getByRole('group', { name: 'Nhận xét bài nói câu 1' });
      await expect(fb.getByRole('button', { name: 'Nghe lại từ 0:01' })).toBeVisible();
      await expect(fb.getByText('nói đúng: “three”')).toBeVisible();
      // Trẻ nhỏ: lời khen trước, chỉ 2 lỗi quan trọng nhất (lỗi cần nói lại luôn có), không thấy lỗi thứ ba
      await expect(fb.getByText('Con nói đủ câu, rất tự tin.')).toBeVisible();
      await expect(fb.getByRole('button', { name: /Nghe lại từ/ })).toHaveCount(2);
      await expect(fb.getByText('Ngữ điệu')).toHaveCount(0);
      await fb.getByRole('button', { name: 'Bấm để nói' }).click();
      await expect(fb.getByText('0:01 /')).toBeVisible({ timeout: 5_000 });
      await fb.getByRole('button', { name: 'Dừng ghi âm' }).click();
      await fb.getByRole('button', { name: 'Dùng bản này' }).click();
      await expect(kidPage.getByText('Con đã nói lại câu này')).toBeVisible({ timeout: 30_000 });
      const [after] = (await db.query<{ file_id: number; previous_file_id: number; redone_at: Date | null }>('select file_id, previous_file_id, redone_at from submission_item_scores where submission_id = $1', [sub.id])).rows;
      expect(after.previous_file_id).toBe(fileId);
      expect(after.file_id).not.toBe(fileId);
      expect(after.redone_at).not.toBeNull();

      // Giáo viên: bản cũ cạnh bản mới; lưu chấm lại không mất bản cũ
      await login(page);
      await page.goto(`/bai-tap/${asg.id}`);
      await page.getByRole('button', { name: 'Chấm bài' }).first().click();
      const dlg = page.getByRole('dialog', { name: `Bài làm của ${kidName}` });
      await expect(dlg.getByLabel('Bản nói cũ câu 1')).toBeVisible();
      await expect(dlg.getByText(/Đã nói lại/)).toBeVisible();
      // Lỗi đã đánh dấu (thuộc bản cũ) vẫn hiện để giáo viên đối chiếu
      await expect(dlg.getByRole('list', { name: 'Lỗi đã đánh dấu câu 1' }).getByText('Âm /θ/ /ð/ (th)')).toBeVisible();
      await dlg.getByLabel('Điểm câu 1').fill('9');
      await dlg.getByRole('button', { name: 'Lưu bài làm' }).click();
      await expectToast(page, /Đã lưu/);
      const [regraded] = (await db.query<{ previous_file_id: number; points: number }>('select previous_file_id, points from submission_item_scores where submission_id = $1', [sub.id])).rows;
      expect(regraded).toEqual({ previous_file_id: fileId, points: 9 });
    } finally {
      await db.query('delete from accounts where email = $1', [email]);
      await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [cls]);
      await db.query('delete from classes where name = $1', [cls]);
      if (fileId) await db.query('delete from uploaded_files where id = $1', [fileId]);
      await db.end();
    }
  });
});
