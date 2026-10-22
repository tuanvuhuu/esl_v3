import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';

// Ghi âm (P35.6) bằng micro giả của Chromium: bấm để nói → dừng → nghe lại → Dùng bản này → đã lưu.
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });
test.use({ permissions: ['microphone'] });

test('học sinh ghi âm câu nghe nhắc lại, nghe lại rồi lưu; tệp lưu đúng loại', async ({ page }) => {
  await page.goto('/hoc-thu');
  await page.waitForURL(/\/cua-toi\/\d+$/);
  // Đi tới câu "Listen and repeat." đầu tiên của bài học thử
  while (!(await page.getByText('Listen and repeat.').isVisible())) await page.getByRole('button', { name: /Tiếp tục/ }).click();

  await page.getByRole('button', { name: 'Bấm để nói' }).click();
  await expect(page.getByText('0:01 /')).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Dừng ghi âm' }).click();
  await expect(page.getByLabel('Nghe lại bản vừa ghi')).toBeVisible();

  // Nói lại thì quay về nút micro, ghi lần hai rồi dùng
  await page.getByRole('button', { name: 'Nói lại' }).click();
  await page.getByRole('button', { name: 'Bấm để nói' }).click();
  await expect(page.getByText('0:01 /')).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Dừng ghi âm' }).click();
  await page.getByRole('button', { name: 'Dùng bản này' }).click();
  await expect(page.getByText('Đã lưu bản ghi âm')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel('Nghe bản đã lưu')).toBeVisible();

  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const [row] = (await db.query<{ mime_type: string; original_name: string; size_bytes: number }>(`select mime_type, original_name, size_bytes from uploaded_files where original_name like 'bai-noi-cau-%' order by id desc limit 1`)).rows;
    expect(row.mime_type).toBe('audio/webm');
    expect(row.original_name).toMatch(/\.webm$/);
    expect(row.size_bytes).toBeGreaterThan(0);
  } finally {
    await db.end();
  }
});
