import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';
import { hashPassword } from '../src/lib/auth/password';

// Màn soạn câu đủ 7 dạng mới (35.4): chọn tranh (có ảnh đáp án), ghép đôi, sắp xếp câu, điền chỗ trống, nghe nhắc lại,
// đọc to, nói về tranh (có tranh gợi ý). Lưu một lần, kiểm dữ liệu từng câu; học sinh mở bài thấy đủ 7 câu.
const run = String(Date.now()).slice(-6);
const CLS = `SC-${run}`;
const EMAIL = `soan-cau-${run}@hoc-sinh.local`;
const PASSWORD = `SoanCau-${run}-x`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('soạn đủ 7 dạng câu mới trong một bài, lưu đúng dữ liệu, học sinh thấy đủ câu', async ({ page, browser }) => {
  test.setTimeout(180_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^SC-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from accounts where student_id in (select id from students where class_id in (${stale}))`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E soạn câu', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'SC-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01') returning id`, [`Bé soạn câu ${run}`, `be soan cau ${run}`, cls.id])).rows;
    await db.query(`insert into accounts (full_name, email, role, status, password_hash, student_id) values ($1, $2, 'student', 'active', $3, $4)`, [`Bé soạn câu ${run}`, EMAIL, await hashPassword(PASSWORD), kid.id]);
    const [asg] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + interval '3 days', 10) returning id`, [cls.id, `Đủ dạng ${run}`])).rows;

    await login(page);
    await page.goto(`/bai-tap/${asg.id}`);
    await page.getByRole('button', { name: 'Soạn câu hỏi' }).click();
    const editor = page.getByRole('dialog').last();
    const add = async (n: number, type: string, prompt: string) => {
      await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
      const card = editor.getByRole('region', { name: `Câu ${n}`, exact: true });
      await card.getByRole('radiogroup', { name: `Loại của câu ${n}` }).getByRole('radio', { name: type }).click();
      await card.getByLabel(`Nội dung câu ${n}`).fill(prompt);
      return card;
    };

    // 1. Nghe chọn tranh: điền tên mọi tranh, đáp án 2 đúng, tranh 1 có ảnh
    const c1 = await add(1, 'Nghe chọn tranh', 'Touch the cat.');
    const names = c1.getByPlaceholder(/^Tên tranh \/ từ \d$/);
    const labels = ['dog', 'cat', 'bird', 'fish', 'duck', 'frog'];
    for (let i = 0; i < (await names.count()); i++) await names.nth(i).fill(labels[i]);
    await c1.getByLabel('Đáp án 2 đúng').check();
    await c1.locator('label', { hasText: 'Tải ảnh' }).first().locator('input[type="file"]').setInputFiles({ name: 'dog.png', mimeType: 'image/png', buffer: PNG });
    await expect(c1.getByText('Đổi ảnh')).toBeVisible({ timeout: 30_000 });

    // 2. Ghép đôi
    const c2 = await add(2, 'Ghép đôi', 'Match the words.');
    for (const [i, [l, r]] of [['mother', 'mẹ'], ['father', 'bố']].entries()) {
      await c2.getByPlaceholder('Vế trái (VD: mother)').nth(i).fill(l);
      await c2.getByPlaceholder('Vế phải (VD: mẹ)').nth(i).fill(r);
    }
    // Khung ghép đôi có sẵn cặp mẫu thứ ba: bỏ đi
    while ((await c2.getByPlaceholder('Vế trái (VD: mother)').count()) > 2) await c2.getByRole('button', { name: 'Xoá cặp 3' }).click();
    // 3. Sắp xếp câu
    const c3 = await add(3, 'Sắp xếp câu', 'Put the words in order.');
    await c3.getByPlaceholder('VD: My father can cook.').fill('My father can cook');
    // 4. Điền chỗ trống
    const c4 = await add(4, 'Điền chỗ trống', 'Fill in the blank.');
    await c4.getByPlaceholder('VD: This is my [brother]. He is [three] years old.').fill('I [have] a cat.');
    await c4.getByPlaceholder('VD: brother | bro').fill('have | own');
    // 5–7. Ba dạng nói
    const c5 = await add(5, 'Nghe nhắc lại', 'Listen and repeat.');
    await c5.getByPlaceholder('VD: This is my brother. He is three.').fill('Good morning, teacher.');
    const c6 = await add(6, 'Đọc to', 'Read aloud.');
    await c6.getByPlaceholder('VD: This is my brother. He is three.').fill('I like red apples.');
    const c7 = await add(7, 'Nói về tranh', 'Look and say.');
    await c7.getByPlaceholder('VD: This is my brother. He is three.').fill('It is a cat.');
    await c7.getByLabel('Tải tranh gợi ý').setInputFiles({ name: 'cat.png', mimeType: 'image/png', buffer: PNG });
    await expect(c7.getByRole('button', { name: 'Xoá tranh' })).toBeVisible({ timeout: 30_000 });

    await editor.getByRole('button', { name: 'Lưu câu hỏi' }).click();
    await expectToast(page, /Đã lưu 7 câu hỏi/);

    const rows = (
      await db.query<{ id: number; item_type: string; reference_text: string; passage: string; image_file_id: number | null }>(
        `select id, item_type, reference_text, passage, image_file_id from assignment_items where assignment_id = $1 order by position`,
        [asg.id],
      )
    ).rows;
    expect(rows.map((r) => r.item_type)).toEqual(['picture_choice', 'match', 'order', 'gap_fill', 'speak_repeat', 'speak_read', 'speak_picture']);
    const opts = (await db.query<{ label: string; is_correct: boolean; image_file_id: number | null }>(`select label, is_correct, image_file_id from assignment_item_options where item_id = $1 order by position`, [rows[0].id])).rows;
    expect(opts.filter((o) => o.is_correct).map((o) => o.label)).toEqual(['cat']);
    expect(opts[0].image_file_id).not.toBeNull();
    const pairs = (await db.query<{ left_label: string; right_label: string }>(`select left_label, right_label from assignment_item_pairs where item_id = $1 order by position`, [rows[1].id])).rows;
    expect(pairs).toEqual([{ left_label: 'mother', right_label: 'mẹ' }, { left_label: 'father', right_label: 'bố' }]);
    expect(rows[2].reference_text).toBe('My father can cook');
    expect(rows[3]).toMatchObject({ passage: 'I [have] a cat.', reference_text: 'have | own' });
    expect(rows.slice(4).map((r) => r.reference_text)).toEqual(['Good morning, teacher.', 'I like red apples.', 'It is a cat.']);
    expect(rows[6].image_file_id).not.toBeNull();

    // Học sinh mở bài: đủ 7 câu
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await phone.goto('/dang-nhap');
    await phone.getByLabel('Email').fill(EMAIL);
    await phone.getByLabel('Mật khẩu').fill(PASSWORD);
    await phone.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await phone.waitForURL('**/cua-toi**');
    await phone.goto(`/cua-toi/${asg.id}`);
    await expect(phone.getByText(/^1\/7$/)).toBeVisible();
    expect(await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await phone.context().close();
  } finally {
    await db.query('delete from accounts where email = $1', [EMAIL]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.end();
  }
});
