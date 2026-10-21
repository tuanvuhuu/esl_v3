import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal, TEACHER_THU_HA } from './env';
import { dialogById, expectToast, login, uniq } from './helpers';

// Soạn nhanh (P36.3): dán danh sách từ → chọn dạng → xem lại, bỏ một câu → thêm vào bài → lưu.
// Tạo bài riêng có chữ "E2E" trong tên để global-teardown dọn nếu test dừng giữa chừng.

const WORDS = ['cat - con mèo - 🐱', 'dog - con chó', 'fish', 'bird', 'rabbit - con thỏ', 'duck, con vịt', 'elephant', 'monkey - con khỉ - 🐵'].join('\n');

async function openQuickCompose(page: Page, assignmentId: number) {
  await page.goto(`/bai-tap/${assignmentId}`);
  await page.getByRole('button', { name: 'Soạn câu hỏi' }).click();
  await dialogById(page, 'items-editor-title').getByRole('button', { name: 'Soạn nhanh' }).click();
  const dialog = dialogById(page, 'quick-compose-title');
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('soạn nhanh', () => {
  test('dán danh sách từ, sinh câu theo trình độ, bỏ một câu, thêm vào bài và lưu', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const title = uniq('BT E2E soạn nhanh');
    const [{ id }] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, description, due_at, max_score) values (2, $1, '', now() + interval '7 days', 10) returning id`, [title])).rows;
    try {
      await login(page);
      const dialog = await openQuickCompose(page, id);

      // Bước 1: tách danh sách, thiếu nghĩa thì lấy từ bộ từ có sẵn
      await dialog.getByLabel('Danh sách từ').fill(WORDS);
      const parsed = dialog.getByRole('region', { name: 'Từ đã nhận' });
      await expect(parsed.getByText('8 từ đã nhận')).toBeVisible();
      await expect(parsed.getByText('con chim').first()).toBeVisible();
      await dialog.getByRole('button', { name: 'Tiếp: chọn dạng câu' }).click();

      // Bước 2: dạng theo câu bị tắt khi chưa dán câu; bỏ dạng nghe nhắc lại
      await expect(dialog.getByRole('checkbox', { name: 'Sắp xếp câu' })).toHaveAttribute('aria-disabled', 'true');
      await expect(dialog.getByText('Cần dán câu ở bước 1').first()).toBeVisible();
      const repeat = dialog.getByRole('checkbox', { name: 'Nghe nhắc lại' });
      await expect(repeat).toHaveAttribute('aria-checked', 'true');
      await repeat.click();
      await expect(repeat).toHaveAttribute('aria-checked', 'false');
      await dialog.getByRole('button', { name: /^Sinh \d+ câu$/ }).click();

      // Bước 3: bỏ câu 1 qua hộp xác nhận
      const list = dialog.getByRole('list', { name: 'Câu đã sinh' });
      const before = await list.getByRole('listitem').count();
      expect(before).toBeGreaterThan(5);
      await page.getByRole('button', { name: 'Thao tác câu 1', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Bỏ câu' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Bỏ câu' }).click();
      await expect(list.getByRole('listitem')).toHaveCount(before - 1);

      // Thêm vào bài: quay lại màn soạn với đủ câu, lưu được
      await dialog.getByRole('button', { name: `Thêm ${before - 1} câu vào bài` }).click();
      const editor = dialogById(page, 'items-editor-title');
      await expect(editor).toBeVisible();
      await expect(editor.locator('section[aria-label^="Câu "]')).toHaveCount(before - 1);
      await editor.getByRole('button', { name: 'Lưu câu hỏi' }).click();
      await expectToast(page, new RegExp(`Đã lưu ${before - 1} câu hỏi`));

      const types = (await db.query<{ item_type: string }>('select distinct item_type from assignment_items where assignment_id = $1', [id])).rows.map((r) => r.item_type);
      expect(types).toEqual(expect.arrayContaining(['picture_choice', 'match', 'choice']));
      expect(types).not.toContain('speak_repeat');
      expect(errors.filter((e) => /same key|Hydration/i.test(e))).toEqual([]);
    } finally {
      await db.query('delete from assignments where id = $1', [id]);
      await db.end();
    }
  });

  test('điện thoại 390px: chọn từ có sẵn, dán câu, không tràn ngang, nút chính 44px', async ({ page }) => {
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const title = uniq('BT E2E soạn nhanh ĐT');
    const [{ id }] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, description, due_at, max_score) values (2, $1, '', now() + interval '7 days', 10) returning id`, [title])).rows;
    try {
      await login(page);
      await page.setViewportSize({ width: 390, height: 844 });
      const dialog = await openQuickCompose(page, id);

      await dialog.getByRole('tab', { name: 'Chọn từ có sẵn' }).click();
      await dialog.getByRole('button', { name: 'Chọn 8 từ hay gặp' }).click();
      await expect(dialog.getByText('8 từ đã nhận')).toBeVisible();
      await dialog.getByRole('tab', { name: 'Dán câu' }).click();
      await dialog.getByLabel('Câu tiếng Anh').fill('I have a little dog. The monkey likes bananas. My cat is very small.');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

      const next = dialog.getByRole('button', { name: 'Tiếp: chọn dạng câu' });
      expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await next.click();
      await expect(dialog.getByRole('checkbox', { name: 'Sắp xếp câu' })).toHaveAttribute('aria-checked', 'true');
      await dialog.getByRole('button', { name: /^Sinh \d+ câu$/ }).click();

      // Điện thoại: thẻ câu có nút chữ thay cho menu ⋯
      const first = dialog.getByRole('list', { name: 'Câu đã sinh' }).getByRole('listitem').first();
      await expect(first.getByRole('button', { name: 'Bốc lại' })).toBeVisible();
      await expect(first.getByRole('button', { name: /Thao tác câu/ })).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    } finally {
      await db.query('delete from assignments where id = $1', [id]);
      await db.end();
    }
  });

  test('kho từ: chọn 8 từ chủ đề Đồ ăn rồi sinh bài; giáo viên lưu từ mới thì chờ duyệt, quản trị duyệt', async ({ page }) => {
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const title = uniq('BT E2E kho từ');
    const word = `zq${Date.now().toString(36)}`;
    const [{ id }] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, description, due_at, max_score) values (2, $1, '', now() + interval '7 days', 10) returning id`, [title])).rows;
    try {
      // Giáo viên: chọn từ theo chủ đề, sinh bài; lưu một từ tự gõ vào kho (chờ duyệt)
      await login(page, TEACHER_THU_HA);
      let dialog = await openQuickCompose(page, id);
      await dialog.getByRole('tab', { name: 'Chọn từ có sẵn' }).click();
      await dialog.getByRole('group', { name: 'Chủ đề' }).getByRole('button', { name: /Đồ ăn, đồ uống/ }).click();
      await expect(dialog.getByRole('group', { name: 'Từ có sẵn' }).getByRole('button', { name: /apple/ })).toBeVisible();
      await dialog.getByRole('button', { name: 'Chọn 8 từ hay gặp' }).click();
      await expect(dialog.getByText('8 từ đã nhận')).toBeVisible();

      await dialog.getByRole('tab', { name: 'Dán danh sách từ' }).click();
      await dialog.getByLabel('Danh sách từ').fill(`${word} - từ thử nghiệm`);
      await expect(dialog.getByText('9 từ đã nhận')).toBeVisible();
      await dialog.getByRole('button', { name: 'Lưu 1 từ vào kho chung' }).click();
      await expect(dialog.getByText(/thêm 1 từ \(chờ duyệt\)/)).toBeVisible();
      const [row] = (await db.query<{ approved: boolean; source: string }>('select approved, source from vocab_items where headword = $1', [word])).rows;
      expect(row).toEqual({ approved: false, source: 'teacher' });

      await dialog.getByRole('button', { name: 'Tiếp: chọn dạng câu' }).click();
      await dialog.getByRole('button', { name: /^Sinh \d+ câu$/ }).click();
      await expect(dialog.getByRole('list', { name: 'Câu đã sinh' }).getByText(/apple|banana|milk|bread|egg|rice|cake|water|juice/).first()).toBeVisible();

      // Quản trị: thấy chip "Chờ duyệt", duyệt từ
      await page.context().clearCookies();
      await login(page);
      dialog = await openQuickCompose(page, id);
      await dialog.getByRole('tab', { name: 'Chọn từ có sẵn' }).click();
      await dialog.getByRole('group', { name: 'Chủ đề' }).getByRole('button', { name: /Chờ duyệt/ }).click();
      const pending = dialog.getByRole('group', { name: 'Từ có sẵn' }).locator('div', { hasText: word }).first();
      await pending.getByRole('button', { name: 'Duyệt' }).click();
      await expect.poll(async () => (await db.query<{ approved: boolean }>('select approved from vocab_items where headword = $1', [word])).rows[0]?.approved).toBe(true);
    } finally {
      await db.query('delete from vocab_items where headword = $1', [word]);
      await db.query('delete from assignments where id = $1', [id]);
      await db.end();
    }
  });

  test('dán đoạn 4 câu: xem trước từng câu, sinh sắp xếp, điền chỗ trống, đọc to', async ({ page }) => {
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const [{ id }] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, description, due_at, max_score) values (2, $1, '', now() + interval '7 days', 10) returning id`, [uniq('BT E2E dán câu')])).rows;
    try {
      await login(page);
      const dialog = await openQuickCompose(page, id);
      await dialog.getByRole('tab', { name: 'Dán câu' }).click();
      await dialog.getByLabel('Câu tiếng Anh').fill('I like red apples. The cat is on the mat. My little brother can ride a bike very well every day after school. We drink milk.');
      const list = dialog.getByRole('list', { name: 'Câu đã nhận' });
      await expect(list.getByRole('listitem')).toHaveCount(4);
      // Lớp A1: câu 4–6 từ sắp xếp được, câu dài thì không
      await expect(list.getByRole('listitem').nth(0).getByText('Sắp xếp được')).toBeVisible();
      await expect(list.getByRole('listitem').nth(2).getByText('Không hợp độ dài để sắp xếp')).toBeVisible();
      await expect(list.getByRole('listitem').nth(0).getByText(/Đục: apples/)).toBeVisible();

      await dialog.getByRole('button', { name: 'Tiếp: chọn dạng câu' }).click();
      for (const name of ['Sắp xếp câu', 'Điền chỗ trống', 'Đọc to']) await expect(dialog.getByRole('checkbox', { name })).toHaveAttribute('aria-checked', 'true');
      await dialog.getByRole('button', { name: /^Sinh \d+ câu$/ }).click();
      const items = dialog.getByRole('list', { name: 'Câu đã sinh' });
      await expect(items.getByText('Put the words in order.').first()).toBeVisible();
      await expect(items.getByText(/_____/).first()).toBeVisible();
      await expect(items.getByText('Read aloud.').first()).toBeVisible();
    } finally {
      await db.query('delete from assignments where id = $1', [id]);
      await db.end();
    }
  });
});
