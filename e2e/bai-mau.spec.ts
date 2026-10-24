import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';
import { hashPassword } from '../src/lib/auth/password';
import { STARTERS_SET } from '../src/lib/sample-sets';

// Bộ bài mẫu Starters (35.21): giáo vụ thêm vào lớp thử ở Cơ sở test (bấm lại không tạo trùng); học sinh trên màn
// điện thoại làm trọn bài Starters 1 (câu và đáp án đã xáo theo học sinh) và được đủ điểm phần tự chấm.
// Học sinh thử chưa có đồng ý ghi âm nên câu nói được bỏ qua.
const run = String(Date.now()).slice(-6);
const CLS = `BM-${run}`;
const EMAIL = `bai-mau-${run}@hoc-sinh.local`;
const PASSWORD = `BaiMau-${run}-x`;
const LESSON = STARTERS_SET.lessons[0];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const label = (raw: string) => raw.replace(/^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*\s*/u, '');

// Trả lời câu đang hiện theo đáp án trong dữ liệu bài mẫu
async function answerCurrent(page: Page) {
  const prompt = (await page.getByRole('heading', { level: 2 }).first().textContent())?.trim() ?? '';
  let item = LESSON.items.find((i) => i.prompt === prompt);
  if (prompt === 'Put the words in order.') {
    // Hai câu sắp xếp cùng đề: nhận ra bằng bộ từ đang hiện
    const shown = (await page.locator('button:enabled').allTextContents()).map((t) => t.trim());
    item = LESSON.items.find((i) => i.itemType === 'order' && (i.referenceText ?? '').split(' ').every((w) => shown.includes(w)));
  }
  expect(item, `không nhận ra câu "${prompt}"`).toBeTruthy();
  const it = item!;
  if (it.itemType === 'picture_choice' || it.itemType === 'choice') {
    const correct = label(it.options!.find((o) => o.isCorrect)!.label);
    await page.getByRole('button', { name: new RegExp(`${esc(correct)}$`) }).click();
  } else if (it.itemType === 'match') {
    for (const p of it.pairs!) {
      await page.getByRole('button', { name: p.left, exact: true }).click();
      await page.getByRole('button', { name: p.right, exact: true }).click();
    }
  } else if (it.itemType === 'order') {
    // Từ trong ngân hàng nằm sau ô câu đã xếp: lấy nút cuối cùng còn bấm được
    for (const w of (it.referenceText ?? '').split(' ')) await page.getByRole('button', { name: w, exact: true }).locator('visible=true').last().click();
  } else if (it.itemType === 'gap_fill') {
    await page.getByPlaceholder('Gõ từ của bạn…').fill((it.referenceText ?? '').split('|')[0]);
  } else if (it.itemType === 'text') {
    await page.getByPlaceholder('Nhập bài làm của bạn…').fill('My favourite toy is my red kite.');
  }
}

test('bộ bài mẫu: thêm vào lớp không trùng; học sinh trên điện thoại làm trọn một bài, đủ điểm phần tự chấm', async ({ page, browser }) => {
  test.setTimeout(150_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^BM-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
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
         values ($1, $2, 'E2E bài mẫu', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'BM-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [`Bé bài mẫu ${run}`, `be bai mau ${run}`, cls.id])).rows;
    await db.query(`insert into accounts (full_name, email, role, status, password_hash, student_id) values ($1, $2, 'student', 'active', $3, $4)`, [`Bé bài mẫu ${run}`, EMAIL, await hashPassword(PASSWORD), kid.id]);

    // Giáo vụ thêm bộ bài mẫu, bấm lại thì báo đã có
    await login(page);
    await page.goto(`/bai-tap?cls=${cls.id}`);
    for (const expected of [`Đã thêm 3 bài mẫu và 1 danh sách từ vào lớp ${CLS}`, `Lớp ${CLS} đã có đủ bộ bài mẫu Starters`]) {
      await page.getByRole('button', { name: 'Bộ bài mẫu' }).click();
      const dlg = page.getByRole('dialog', { name: /Thêm bộ bài mẫu Starters vào lớp/ });
      await expect(dlg.getByRole('list', { name: 'Nội dung bộ bài mẫu' })).toContainText(LESSON.title);
      await dlg.getByRole('button', { name: 'Thêm vào lớp' }).click();
      await expectToast(page, expected);
    }
    const counts = (await db.query<{ title: string; items: number }>(`select a.title, (select count(*)::int from assignment_items i where i.assignment_id = a.id) as items from assignments a where a.class_id = $1 order by a.title`, [cls.id])).rows;
    expect(counts).toEqual(STARTERS_SET.lessons.map((l) => ({ title: l.title, items: l.items.length })));
    const words = (await db.query(`select 1 from word_list_items i join word_lists l on l.id = i.list_id where l.class_id = $1`, [cls.id])).rowCount;
    expect(words).toBe(STARTERS_SET.wordList.words.length);
    const [{ id: lessonId }] = (await db.query<{ id: number }>(`select id from assignments where class_id = $1 and title = $2`, [cls.id, LESSON.title])).rows;

    // Học sinh trên điện thoại làm trọn bài Starters 1
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await phone.goto('/dang-nhap');
    await phone.getByLabel('Email').fill(EMAIL);
    await phone.getByLabel('Mật khẩu').fill(PASSWORD);
    await phone.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await phone.waitForURL('**/cua-toi**');
    await expect(phone.getByRole('list', { name: 'Đường học' }).getByRole('listitem')).toHaveCount(3);
    await phone.goto(`/cua-toi/${lessonId}`);
    const done = phone.getByRole('button', { name: /Xong bài/ });
    for (let i = 0; i < LESSON.items.length; i++) {
      await expect(phone.getByText(new RegExp(`^${i + 1}/${LESSON.items.length}$`))).toBeVisible();
      await answerCurrent(phone);
      expect(await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      if (i < LESSON.items.length - 1) await phone.getByRole('button', { name: /Tiếp tục/ }).click();
    }
    await done.click();
    const autoMax = LESSON.items.filter((i) => ['picture_choice', 'choice', 'match', 'order', 'gap_fill'].includes(i.itemType)).reduce((s, i) => s + i.points, 0);
    await expect(phone.getByText(`Đúng ${autoMax}/${autoMax} điểm phần tự chấm`)).toBeVisible();
    await expect(phone.getByRole('img', { name: '3 trên 3 sao' })).toBeVisible();
    await phone.context().close();
  } finally {
    await db.query(`delete from word_lists where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from accounts where email = $1', [EMAIL]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.end();
  }
});
