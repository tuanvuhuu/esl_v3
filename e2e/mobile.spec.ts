import { expect, test } from '@playwright/test';
import { ADMIN } from './env';
import { login } from './helpers';

test.describe('điện thoại: bộ lọc và bảng Tính năng', () => {
  test.use({ viewport: { width: 390, height: 820 } });

  test('bộ lọc học sinh là bảng trượt từ đáy và áp dụng được', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/hoc-sinh');
    await page.getByRole('button', { name: /^Bộ lọc/ }).click();
    const sheet = page.locator('[role="dialog"][aria-labelledby="filter-title"]');
    await expect(sheet).toBeVisible();
    await sheet.getByText('IELTS-K12', { exact: false }).first().click();
    await sheet.getByRole('button', { name: 'Xem học sinh' }).click();
    await page.waitForURL(/cls=1/);
    await expect(page.locator('[role="dialog"][aria-labelledby="filter-title"]')).toHaveCount(0);
  });

  test('bảng Tính năng có huy hiệu số việc chờ và liên kết Xem tất cả', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tong-quan');
    await page.getByRole('button', { name: 'Tính năng' }).click();
    const sheet = page.locator('[role="dialog"][aria-label="Tính năng"]');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Xem tất cả' })).toBeVisible();
    await expect(sheet.locator('[aria-label$="mục chờ"]').first()).toBeVisible();
  });
});
