import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Chuông thông báo trên thanh đầu: số việc khớp với Cần chú ý ở Tổng quan, bấm mở và đóng được danh sách.
// Chỉ đọc dữ liệu, không ghi gì nên chạy song song được.

test('chuông thông báo: số việc khớp với Cần chú ý ở Tổng quan, mở rồi đóng bằng Esc', async ({ page }) => {
  await login(page);
  await page.goto('/tong-quan', { waitUntil: 'load' });
  // Số việc nằm ở huy hiệu trong khối Cần chú ý (aria-label "N việc")
  const badge = await page.getByRole('region', { name: 'Cần chú ý' }).getByLabel(/^\d+ việc$/).textContent();
  const expected = Number(badge?.trim() ?? '0');
  const bell = page.getByRole('button', { name: /^Thông báo/ });
  if (expected === 0) await expect(bell).toHaveAccessibleName('Thông báo');
  else await expect(bell).toHaveAccessibleName(`Thông báo, ${expected} việc cần chú ý`);
  await bell.click();
  const panel = page.getByRole('dialog', { name: 'Thông báo' });
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

test('chuông thông báo: bấm một việc thì mở trang của việc đó và bảng tự đóng', async ({ page }) => {
  await login(page);
  await page.goto('/tong-quan', { waitUntil: 'load' });
  await page.getByRole('button', { name: /^Thông báo/ }).click();
  const panel = page.getByRole('dialog', { name: 'Thông báo' });
  await expect(panel).toBeVisible();
  const first = panel.getByRole('link').first();
  if ((await first.count()) === 0) {
    await expect(panel.getByText('Hôm nay không có việc gấp.')).toBeVisible();
    return;
  }
  await first.click();
  await expect(page).not.toHaveURL(/\/tong-quan$/);
  await expect(panel).toHaveCount(0);
});
