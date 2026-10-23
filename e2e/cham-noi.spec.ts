import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

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

    // Lưu điểm câu nói: bản ghi âm và đáp án chọn tranh vẫn còn (E-085)
    await dlg.getByLabel('Điểm câu 1').fill('4');
    await dlg.getByRole('button', { name: 'Lưu bài làm' }).click();
    await expectToast(page, /Đã lưu/);
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
