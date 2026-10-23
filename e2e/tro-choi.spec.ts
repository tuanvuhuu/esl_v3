import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { login } from './helpers';
import { hashPassword } from '../src/lib/auth/password';

// Trò chơi từ vựng (35.15, 35.16): học sinh lớp thử ở Cơ sở test chơi đủ tám trò từ danh sách của lớp mình, được 3 sao;
// danh sách của lớp khác không mở được; điện thoại 360/390px không tràn; giáo viên chơi thử từ màn Danh sách từ.
const run = String(Date.now()).slice(-6);
const CLS = `TC-${run}`;
const OTHER = `TC-${run}-B`;
const KID = `Bé chơi ${run}`;
const EMAIL = `tro-choi-${run}@hoc-sinh.local`;
const PASSWORD = `TroChoi-${run}-x`;
const LIST = `Animals game ${run}`;
const WORDS: [string, string, string, string][] = [
  ['cat', 'con mèo', '🐱', 'I have a cat.'],
  ['dog', 'con chó', '🐶', 'The dog runs fast.'],
  ['bird', 'con chim', '🐦', 'A bird can fly.'],
  ['fish', 'con cá', '🐟', ''],
];

async function finishWith(page: Page, text: string) {
  const result = page.getByRole('status', { name: 'Kết quả' });
  await expect(result).toContainText(text);
  await expect(result.getByLabel('3 sao')).toBeVisible();
  await result.getByRole('button', { name: 'Trò khác' }).click();
}

// Xếp ô theo đáp án đang đặt ở data-target (ghép chữ: từng chữ cái; xây câu: từng từ)
async function arrange(page: Page, rounds: number, counter: string, joiner: string) {
  for (let i = 0; i < rounds; i++) {
    await expect(page.getByText(new RegExp(`^${counter} ${i + 1}/${rounds}`))).toBeVisible();
    const target = (await page.locator('[data-target]').getAttribute('data-target'))!;
    const parts = joiner === '' ? [...target] : target.split(joiner);
    for (const part of parts) await page.locator(`[data-tile="${part}"]:enabled`).first().click();
  }
}

test('trò chơi từ vựng: học sinh chơi đủ tám trò, không mở được danh sách lớp khác; giáo viên chơi thử', async ({ page, browser }) => {
  test.setTimeout(180_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^TC-[0-9]{6}(-B)?$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from word_lists where class_id in (${stale})`);
  await db.query(`delete from accounts where student_id in (select id from students where class_id in (${stale}))`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const insertClass = async (name: string) =>
      (
        await db.query<{ id: number }>(
          `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
           values ($1, $2, 'E2E trò chơi', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'TC-P', 10) returning id`,
          [campus.id, name, teacher.id],
        )
      ).rows[0].id;
    const classId = await insertClass(CLS);
    const otherId = await insertClass(OTHER);
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [KID, `be choi ${run}`, classId])).rows;
    await db.query(`insert into accounts (full_name, email, role, status, password_hash, student_id) values ($1, $2, 'student', 'active', $3, $4)`, [KID, EMAIL, await hashPassword(PASSWORD), kid.id]);
    const insertList = async (name: string, cls: number) => {
      const [l] = (await db.query<{ id: number }>(`insert into word_lists (name, class_id) values ($1, $2) returning id`, [name, cls])).rows;
      for (const [k, [word, meaning, emoji, sentence]] of WORDS.entries()) {
        await db.query(`insert into word_list_items (list_id, position, word, meaning_vi, emoji, sentence) values ($1, $2, $3, $4, $5, $6)`, [l.id, k + 1, word, meaning, emoji, sentence]);
      }
      return l.id;
    };
    const listId = await insertList(LIST, classId);
    const otherList = await insertList(`${LIST} lớp khác`, otherId);

    // Học sinh đăng nhập: danh sách của lớp hiện ở mục Trò chơi từ vựng, danh sách lớp khác thì không
    const kidPage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await kidPage.goto('/dang-nhap');
    await kidPage.getByLabel('Email').fill(EMAIL);
    await kidPage.getByLabel('Mật khẩu').fill(PASSWORD);
    await kidPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await kidPage.waitForURL('**/cua-toi**');
    const games = kidPage.getByRole('region', { name: 'Trò chơi từ vựng' });
    await expect(games.getByRole('link', { name: LIST, exact: true })).toBeVisible();
    await expect(games.getByRole('link', { name: `${LIST} lớp khác` })).toHaveCount(0);
    await games.getByRole('link', { name: LIST, exact: true }).click();
    await expect(kidPage.getByRole('heading', { name: 'Chọn trò chơi' })).toBeVisible();
    for (const w of [360, 390]) {
      await kidPage.setViewportSize({ width: w, height: 800 });
      expect(await kidPage.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }

    // Lật thẻ nhớ: 4 từ thành 8 thẻ, lật đúng từng cặp
    await kidPage.getByRole('button', { name: /Lật thẻ nhớ/ }).click();
    for (let p = 0; p < WORDS.length; p++) {
      await kidPage.locator(`[data-pair="${p}"]`).nth(0).click();
      await kidPage.locator(`[data-pair="${p}"]`).nth(1).click();
      await expect(kidPage.getByText(`Đã ghép ${p + 1}/${WORDS.length} cặp`)).toBeVisible();
    }
    expect(await kidPage.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await finishWith(kidPage, 'Đúng 4/4');

    // Đập chuột: nghe từ (đích ở data-target) rồi chạm đúng tranh
    await kidPage.getByRole('button', { name: /Đập chuột từ vựng/ }).click();
    for (let i = 0; i < WORDS.length; i++) {
      await expect(kidPage.getByText(new RegExp(`^Lượt ${i + 1}/${WORDS.length}`))).toBeVisible();
      const target = await kidPage.locator('[data-target]').getAttribute('data-target');
      await kidPage.locator(`[data-word="${target}"]`).click();
    }
    await finishWith(kidPage, 'Đúng 4/4');

    // Ghép chữ: bốn từ
    await kidPage.getByRole('button', { name: /Ghép chữ/ }).click();
    await arrange(kidPage, WORDS.length, 'Từ', '');
    await finishWith(kidPage, 'Đúng 4/4');

    // Xây câu: ba từ có câu mẫu
    await kidPage.getByRole('button', { name: /Xây câu/ }).click();
    await arrange(kidPage, 3, 'Câu', ' ');
    await finishWith(kidPage, 'Đúng 3/3');

    // Bingo nghe: 4 từ thành bảng 2×2, hai ô bất kỳ đã thành một hàng
    await kidPage.getByRole('button', { name: /Bingo nghe/ }).click();
    for (let k = 0; k < 2; k++) {
      await expect(kidPage.getByText(`Đã đánh dấu ${k} ô`)).toBeVisible();
      const target = await kidPage.locator('[data-target]').getAttribute('data-target');
      await kidPage.locator(`[data-word="${target}"]`).click();
    }
    await finishWith(kidPage, 'Đúng 2/2');

    // Simon nói: ba chuỗi dài dần, chạm lại đúng thứ tự (nút mở khi phát xong chuỗi)
    await kidPage.getByRole('button', { name: /Simon nói/ }).click();
    for (let r = 0; r < 3; r++) {
      await expect(kidPage.getByText(new RegExp(`^Lượt ${r + 1}/3`))).toBeVisible();
      const seq = (await kidPage.locator('[data-target]').getAttribute('data-target'))!.split('|');
      for (const word of seq) await kidPage.locator(`[data-word="${word}"]`).click({ timeout: 10_000 });
    }
    await finishWith(kidPage, 'Đúng 3/3');

    // Đoán chữ: ba từ, đoán đúng từng chữ cái
    await kidPage.getByRole('button', { name: /Đoán chữ/ }).click();
    for (let i = 0; i < 3; i++) {
      await expect(kidPage.getByText(new RegExp(`^Từ ${i + 1}/3`))).toBeVisible();
      const target = (await kidPage.locator('[data-target]').getAttribute('data-target'))!;
      for (const ch of new Set(target)) await kidPage.locator(`[data-key="${ch}"]`).click();
    }
    await finishWith(kidPage, 'Đúng 3/3');

    // Đua xe: tám câu, chọn đúng từ của tranh
    await kidPage.getByRole('button', { name: /Đua xe/ }).click();
    for (let i = 0; i < 8; i++) {
      await expect(kidPage.getByText(new RegExp(`^Câu ${i + 1}/8`))).toBeVisible();
      const target = await kidPage.locator('[data-target]').getAttribute('data-target');
      await kidPage.locator(`[data-word="${target}"]`).click();
    }
    expect(await kidPage.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await finishWith(kidPage, 'Đúng 8/8');

    // Danh sách của lớp khác: không mở được
    await kidPage.goto(`/cua-toi/tro-choi/${otherList}`);
    await expect(kidPage.getByText('This page could not be found.')).toBeVisible();
    await expect(kidPage.getByRole('heading', { name: 'Chọn trò chơi' })).toHaveCount(0);
    await kidPage.context().close();

    // Giáo viên chơi thử từ menu ⋯ của danh sách
    await login(page);
    await page.goto('/tu-vung');
    await page.getByRole('button', { name: `Thao tác với ${LIST}`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Chơi thử' }).click();
    await page.waitForURL(`**/tu-vung/${listId}`);
    await expect(page.getByRole('heading', { name: 'Chọn trò chơi' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Xây câu/ })).toBeVisible();
  } finally {
    await db.query(`delete from word_lists where name like $1`, [`Animals game ${run}%`]);
    await db.query('delete from accounts where email = $1', [EMAIL]);
    await db.query(`delete from students where class_id in (select id from classes where name in ($1, $2))`, [CLS, OTHER]);
    await db.query('delete from classes where name in ($1, $2)', [CLS, OTHER]);
    await db.end();
  }
});
