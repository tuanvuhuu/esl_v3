import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { hashPassword } from '../src/lib/auth/password';

// Hộp từ và ôn lặp lại ngắt quãng (35.18): lớp thử ở Cơ sở test. Hộp từ trống; chơi xong một trò thì 4 từ của danh sách vào hộp;
// ôn 4 từ (chọn sai 1): từ sai hẹn ngày mai, từ đúng hẹn 2 ngày sau; ôn xong thì trang báo đã xong.
// Kèm quyền xem tệp: học sinh xem được tranh của danh sách lớp mình (404 vì tệp thử không có trong kho), không xem được của lớp khác (403).
const run = String(Date.now()).slice(-6);
const CLS = `OT-${run}`;
const OTHER = `OT-${run}-B`;
const EMAIL = `on-tu-${run}@hoc-sinh.local`;
const PASSWORD = `OnTu-${run}-x`;
const LIST = `Ôn từ ${run}`;

test('hộp từ: chơi xong thì từ vào hộp, ôn một lượt, từ sai hẹn ngày mai, từ đúng hẹn 2 ngày sau', async ({ browser }) => {
  test.setTimeout(120_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^OT-[0-9]{6}(-B)?$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from word_lists where class_id in (${stale})`);
  await db.query(`delete from accounts where student_id in (select id from students where class_id in (${stale}))`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  const fileIds: number[] = [];
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const insertClass = async (name: string) =>
      (
        await db.query<{ id: number }>(
          `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
           values ($1, $2, 'E2E ôn từ', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'OT-P', 10) returning id`,
          [campus.id, name, teacher.id],
        )
      ).rows[0].id;
    const classId = await insertClass(CLS);
    const otherId = await insertClass(OTHER);
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01') returning id`, [`Bé ôn từ ${run}`, `be on tu ${run}`, classId])).rows;
    await db.query(`insert into accounts (full_name, email, role, status, password_hash, student_id) values ($1, $2, 'student', 'active', $3, $4)`, [`Bé ôn từ ${run}`, EMAIL, await hashPassword(PASSWORD), kid.id]);
    for (const k of ['mine', 'other']) {
      fileIds.push((await db.query<{ id: number }>(`insert into uploaded_files (storage_key, original_name, mime_type, size_bytes) values ($1, 'tranh.png', 'image/png', 100) returning id`, [`e2e-on-tu-${k}-${run}`])).rows[0].id);
    }
    const insertList = async (name: string, cls: number, imageFileId: number) => {
      const [l] = (await db.query<{ id: number }>(`insert into word_lists (name, class_id) values ($1, $2) returning id`, [name, cls])).rows;
      const words: [string, string, string][] = [['cat', 'con mèo', '🐱'], ['dog', 'con chó', '🐶'], ['bird', 'con chim', '🐦'], ['fish', 'con cá', '🐟']];
      for (const [k, [w, m, e]] of words.entries()) {
        await db.query(`insert into word_list_items (list_id, position, word, meaning_vi, emoji, image_file_id) values ($1, $2, $3, $4, $5, $6)`, [l.id, k + 1, w, m, e, k === 0 ? imageFileId : null]);
      }
      return l.id;
    };
    await insertList(LIST, classId, fileIds[0]);
    await insertList(`${LIST} lớp khác`, otherId, fileIds[1]);

    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await page.goto('/dang-nhap');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Mật khẩu').fill(PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/cua-toi**');
    const box = page.getByRole('region', { name: 'Ôn từ hôm nay' });
    await expect(box.getByText('Hộp từ đang trống')).toBeVisible();

    // Tranh của danh sách lớp mình: được xem (tệp thử không có trong kho nên 404); của lớp khác: 403
    expect((await page.request.get(`/api/files/${fileIds[0]}`)).status()).toBe(404);
    expect((await page.request.get(`/api/files/${fileIds[1]}`)).status()).toBe(403);

    // Chơi xong lật thẻ nhớ: 4 từ vào hộp
    await page.getByRole('link', { name: LIST, exact: true }).click();
    await page.getByRole('button', { name: /Lật thẻ nhớ/ }).click();
    for (let p = 0; p < 4; p++) {
      await page.locator(`[data-pair="${p}"]`).nth(0).click();
      await page.locator(`[data-pair="${p}"]`).nth(1).click();
    }
    await expect(page.getByText('Đã cất sao vào bộ sưu tập của con')).toBeVisible();
    expect((await db.query('select 1 from word_reviews where student_id = $1', [kid.id])).rowCount).toBe(4);

    await page.goto('/cua-toi');
    await expect(box.getByText('Hôm nay có 4 từ cần ôn')).toBeVisible();
    await expect(box.getByText('Hộp từ có 4 từ')).toBeVisible();
    await box.getByRole('link', { name: 'Ôn 4 từ' }).click();
    await expect(page.getByRole('heading', { name: 'Ôn từ hôm nay' })).toBeVisible();

    // Từ đầu chọn sai, ba từ sau chọn đúng
    let wrongWord = '';
    for (let i = 0; i < 4; i++) {
      await expect(page.getByText(new RegExp(`^Từ ${i + 1}/4`))).toBeVisible();
      const target = (await page.locator('[data-target]').getAttribute('data-target'))!;
      if (i === 0) {
        wrongWord = target;
        await page.locator(`[data-word]:not([data-word="${target}"])`).first().click();
        await expect(page.getByText('Ôn lại từ này ngày mai')).toBeVisible();
      } else {
        await page.locator(`[data-word="${target}"]`).click();
        await expect(page.getByText('Ôn lại từ này 2 ngày nữa')).toBeVisible();
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.getByRole('status', { name: 'Kết quả ôn' })).toContainText('Con nhớ 3/4 từ');

    const rows = (
      await db.query<{ word: string; days: number; review_count: number }>(
        `select word, ((due at time zone 'Asia/Ho_Chi_Minh')::date - (now() at time zone 'Asia/Ho_Chi_Minh')::date) as days, review_count from word_reviews where student_id = $1 order by word`,
        [kid.id],
      )
    ).rows;
    for (const r of rows) {
      expect(r.review_count).toBe(1);
      expect(r.days).toBe(r.word === wrongWord ? 1 : 2);
    }

    await page.goto('/cua-toi');
    await expect(box.getByText('Hôm nay con ôn xong rồi')).toBeVisible();
    await expect(box.getByText(/lần ôn tới/)).toBeVisible();
    await page.context().close();
  } finally {
    await db.query(`delete from word_lists where name like $1`, [`${LIST}%`]);
    await db.query('delete from accounts where email = $1', [EMAIL]);
    await db.query(`delete from students where class_id in (select id from classes where name in ($1, $2))`, [CLS, OTHER]);
    await db.query('delete from classes where name in ($1, $2)', [CLS, OTHER]);
    if (fileIds.length) await db.query('delete from uploaded_files where id = any($1)', [fileIds]);
    await db.end();
  }
});
