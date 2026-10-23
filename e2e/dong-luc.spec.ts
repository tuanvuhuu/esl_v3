import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { hashPassword } from '../src/lib/auth/password';

// Động lực học (35.17): lớp thử ở Cơ sở test có hai bạn. Bé có một bài đã chấm 10/10 (tuần trước, 3 sao), một bài chờ chấm
// (tuần này, 1 sao), một bài chưa làm (0 sao), và lượt chơi hai tuần trước (sao tốt nhất mỗi trò: 3 + 1).
// Trang học sinh: 8 sao, học 3 tuần liền, 1 sticker, truyện đầu còn khoá; mục tiêu lớp 20 sao (2 bạn × 10).
// Chơi thêm một trò được 3 sao thì lên 11 sao, mở truyện đầu và đọc được.
const run = String(Date.now()).slice(-6);
const CLS = `DL-${run}`;
const KID = `Bé động lực ${run}`;
const EMAIL = `dong-luc-${run}@hoc-sinh.local`;
const PASSWORD = `DongLuc-${run}-x`;

test('động lực: sao theo bài và trò chơi, chuỗi tuần, sticker, truyện, mục tiêu lớp; chơi thêm thì cộng sao', async ({ browser }) => {
  test.setTimeout(120_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^DL-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from word_lists where class_id in (${stale})`);
  await db.query(`delete from accounts where student_id in (select id from students where class_id in (${stale}))`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E động lực', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'DL-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const addKid = async (name: string) =>
      (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [name, name.toLowerCase(), cls.id])).rows[0].id;
    const kid = await addKid(KID);
    const mate = await addKid(`Bạn cùng lớp ${run}`);
    await db.query(`insert into accounts (full_name, email, role, status, password_hash, student_id) values ($1, $2, 'student', 'active', $3, $4)`, [KID, EMAIL, await hashPassword(PASSWORD), kid]);
    const asg = async (title: string, days: number) =>
      (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + make_interval(days => $3), 10) returning id`, [cls.id, title, days])).rows[0].id;
    const a1 = await asg(`Bài 1 ${run}`, -5);
    const a2 = await asg(`Bài 2 ${run}`, 1);
    await asg(`Bài 3 ${run}`, 3);
    await db.query(`insert into assignment_submissions (assignment_id, student_id, status, submitted_at, score) values ($1, $2, 'graded', now() - interval '7 days', 10)`, [a1, kid]);
    await db.query(`insert into assignment_submissions (assignment_id, student_id, status, submitted_at) values ($1, $2, 'submitted', now())`, [a2, kid]);
    await db.query(`insert into assignment_submissions (assignment_id, student_id, status, submitted_at, score) values ($1, $2, 'graded', now(), 5)`, [a1, mate]);
    const [list] = (await db.query<{ id: number }>(`insert into word_lists (name, class_id) values ($1, $2) returning id`, [`Động lực ${run}`, cls.id])).rows;
    for (const [k, [w, e]] of [['cat', '🐱'], ['dog', '🐶'], ['bird', '🐦']].entries()) {
      await db.query(`insert into word_list_items (list_id, position, word, emoji) values ($1, $2, $3, $4)`, [list.id, k + 1, w, e]);
    }
    // Chơi lại một trò nhiều lần chỉ tính lượt tốt nhất: whack 2 rồi 3 sao, race 1 sao
    await db.query(
      `insert into game_plays (student_id, word_list_id, game, correct, total, stars, played_at) values
       ($1, $2, 'whack', 2, 3, 2, now() - interval '14 days'), ($1, $2, 'whack', 3, 3, 3, now() - interval '14 days'), ($1, $2, 'race', 1, 8, 1, now() - interval '14 days')`,
      [kid, list.id],
    );

    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await page.goto('/dang-nhap');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Mật khẩu').fill(PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/cua-toi**');

    const summary = page.getByRole('region', { name: 'Sao của con' });
    await expect(summary.getByLabel('8 sao')).toBeVisible();
    await expect(summary.getByText('4 từ bài tập · 4 từ trò chơi')).toBeVisible();
    await expect(summary.getByText('Học 3 tuần liền')).toBeVisible();
    await expect(summary.getByText('Tuần này con đã học rồi. Giỏi lắm!')).toBeVisible();
    // Mục tiêu lớp: 2 bạn × 10 sao, không có bảng xếp hạng
    const goal = summary.getByRole('progressbar', { name: 'Sao cả lớp góp' });
    await expect(goal).toHaveAttribute('aria-valuemax', '20');
    expect(Number(await goal.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(3);

    // Đường học: theo hạn nộp, sao từng chặng
    const path = page.getByRole('list', { name: 'Đường học' });
    await expect(path.getByRole('listitem')).toHaveCount(3);
    await expect(path.getByRole('listitem').nth(0)).toContainText(`Bài 1 ${run}`);
    await expect(path.getByRole('listitem').nth(0).getByLabel('3 trên 3 sao')).toBeVisible();
    await expect(path.getByRole('listitem').nth(1).getByLabel('1 trên 3 sao')).toBeVisible();
    await expect(path.getByRole('listitem').nth(2).getByLabel('0 trên 3 sao')).toBeVisible();

    // Bộ sưu tập: 8 sao mở 1 sticker; truyện đầu cần 10 sao
    await expect(page.getByRole('region', { name: 'Bộ sưu tập sticker' }).getByText('1/12')).toBeVisible();
    await expect(page.getByLabel('Sticker Gà con')).toBeVisible();
    await expect(page.getByLabel('Sticker khoá, cần 10 sao')).toBeVisible();
    await expect(page.getByRole('button', { name: /The Little Cat/ })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

    // Chơi lật thẻ nhớ hoàn hảo: 3 sao, ghi lượt chơi
    await page.getByRole('link', { name: `Động lực ${run}` }).click();
    await page.getByRole('button', { name: /Lật thẻ nhớ/ }).click();
    for (let p = 0; p < 3; p++) {
      await page.locator(`[data-pair="${p}"]`).nth(0).click();
      await page.locator(`[data-pair="${p}"]`).nth(1).click();
    }
    await expect(page.getByText('Đã cất sao vào bộ sưu tập của con')).toBeVisible();
    const plays = (await db.query<{ stars: number }>(`select stars from game_plays where student_id = $1 and game = 'memory'`, [kid])).rows;
    expect(plays).toEqual([{ stars: 3 }]);

    // Về trang: 11 sao, mở truyện đầu và đọc
    await page.goto('/cua-toi');
    await expect(summary.getByLabel('11 sao')).toBeVisible();
    await expect(page.getByLabel('Sticker Cáo nhỏ')).toBeVisible();
    await page.getByRole('button', { name: /The Little Cat/ }).click();
    const story = page.getByRole('dialog', { name: '🐱 The Little Cat' });
    await expect(story.getByText('This is Mimi. Mimi is a little cat.')).toBeVisible();
    await expect(story.getByText('Đây là Mimi. Mimi là một chú mèo nhỏ.')).toBeVisible();
    await page.context().close();
  } finally {
    await db.query(`delete from word_lists where name = $1`, [`Động lực ${run}`]);
    await db.query('delete from accounts where email = $1', [EMAIL]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.end();
  }
});
