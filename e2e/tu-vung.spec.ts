import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Danh sách từ cho trò chơi (35.14): thêm (gõ từ, tải tranh, lấy từ kho), sửa (đổi tên, bỏ một từ), xoá qua xác nhận.
// Danh sách không gắn lớp nên không đụng dữ liệu lớp nào.
const stamp = String(Date.now()).slice(-6);
const NAME = `Animals E2E ${stamp}`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('danh sách từ: thêm có tranh và từ kho, sửa, xoá; điện thoại không tràn', async ({ page }) => {
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await login(page);
    await page.goto('/tu-vung');
    await page.getByRole('button', { name: 'Thêm danh sách' }).click();
    const form = page.getByRole('dialog', { name: 'Thêm danh sách từ' });
    await form.getByPlaceholder('VD: Starters Unit 3 · Animals').fill(NAME);
    await form.getByLabel('Từ 1', { exact: true }).fill('cat');
    await form.getByLabel('Nghĩa từ 1').fill('con mèo');
    await form.getByLabel('Emoji từ 1').fill('🐱');
    await form.getByLabel('Tranh từ 1').setInputFiles({ name: 'cat.png', mimeType: 'image/png', buffer: PNG });
    await expect(form.getByAltText('Tranh từ cat')).toBeVisible({ timeout: 30_000 });
    await form.getByLabel('Từ 2', { exact: true }).fill('dog');
    await form.getByLabel('Nghĩa từ 2').fill('con chó');
    // Lấy một từ trong kho từ vựng: điền vào dòng trống thứ ba
    await form.getByRole('button', { name: 'Lấy từ kho từ vựng' }).click();
    const firstWord = form.getByRole('group', { name: 'Từ có sẵn' }).locator('[aria-pressed="false"]').first();
    await expect(firstWord).toBeVisible({ timeout: 30_000 });
    await firstWord.click();
    await expect(form.getByLabel('Từ 3', { exact: true })).not.toHaveValue('');
    await form.getByRole('button', { name: 'Lưu danh sách' }).click();
    await expectToast(page, `Đã thêm danh sách ${NAME} (3 từ)`);

    const [list] = (await db.query<{ id: number }>('select id from word_lists where name = $1', [NAME])).rows;
    const items = (await db.query<{ word: string; image_file_id: number | null; vocab_item_id: number | null }>('select word, image_file_id, vocab_item_id from word_list_items where list_id = $1 order by position', [list.id])).rows;
    expect(items.map((i) => i.word).slice(0, 2)).toEqual(['cat', 'dog']);
    expect(items[0].image_file_id).not.toBeNull();
    expect(items[2].vocab_item_id).not.toBeNull();

    // Sửa: đổi tên, bỏ từ dog
    await page.getByRole('button', { name: NAME, exact: true }).click();
    const edit = page.getByRole('dialog', { name: `Sửa danh sách · ${NAME}` });
    await expect(edit.getByLabel('Từ 1', { exact: true })).toHaveValue('cat');
    await edit.getByPlaceholder('VD: Starters Unit 3 · Animals').fill(`${NAME} sửa`);
    await edit.getByRole('button', { name: 'Bỏ từ 2' }).click();
    await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, `Đã lưu danh sách ${NAME} sửa`);
    const after = (await db.query<{ word: string }>('select word from word_list_items where list_id = $1 order by position', [list.id])).rows;
    expect(after.map((a) => a.word)).not.toContain('dog');
    expect(after).toHaveLength(2);

    // Điện thoại: thẻ có nút chữ, không tràn ngang
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByText(`${NAME} sửa`).locator("visible=true").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();

    // Xoá qua hộp xác nhận
    await page.getByRole('button', { name: `Thao tác với ${NAME} sửa` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá danh sách' }).click();
    await expectToast(page, `Đã xoá danh sách ${NAME} sửa`);
    expect((await db.query('select 1 from word_lists where id = $1', [list.id])).rowCount).toBe(0);
  } finally {
    await db.query(`delete from word_lists where name like $1`, [`Animals E2E ${stamp}%`]);
    await db.end();
  }
});
