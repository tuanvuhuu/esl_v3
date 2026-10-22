import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Bộ chọn cơ sở trên thanh trên cùng: hiện cơ sở đang xem, đổi được, và nhớ lựa chọn khi tải lại trang.
// Chỉ đổi cookie của trình duyệt, không ghi dữ liệu nên chạy song song được.

test('bộ chọn cơ sở: hiện cơ sở mặc định, đổi sang tất cả và nhớ khi tải lại', async ({ page }) => {
  await login(page);
  await page.goto('/tong-quan', { waitUntil: 'load' });
  const picker = page.getByRole('button', { name: /^Cơ sở: / });
  await expect(picker).toHaveAccessibleName('Cơ sở: Cơ sở test');

  await picker.click();
  await page.getByRole('option', { name: 'Tất cả cơ sở' }).click();
  await expect(page.getByRole('button', { name: /^Cơ sở: / })).toHaveAccessibleName('Cơ sở: Tất cả cơ sở');

  // Chờ máy chủ ghi cookie trước khi tải lại, vì ô chọn đổi ngay khi bấm còn máy chủ chạy sau
  await expect
    .poll(async () => (await page.context().cookies()).find((c) => c.name === 'esl-campus')?.value)
    .toBe('all');
  await page.reload({ waitUntil: 'load' });
  await expect(page.getByRole('button', { name: /^Cơ sở: / })).toHaveAccessibleName('Cơ sở: Tất cả cơ sở');
});

test('bộ chọn cơ sở trên điện thoại: chỉ hiện icon, bấm mở danh sách có cơ sở', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto('/tong-quan', { waitUntil: 'load' });
  const picker = page.getByRole('button', { name: /^Cơ sở: / });
  await expect(picker).toBeVisible();
  await expect(picker.getByText('Cơ sở test', { exact: true })).toBeHidden();
  await picker.click();
  await expect(page.getByRole('dialog', { name: 'Cơ sở' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Cơ sở test' })).toBeVisible();
});
