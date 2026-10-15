import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Ô tìm trên thanh đầu chỉ hiện chữ khi đang ở trang Học sinh (theo ?q=). Sang trang khác thì ô trống, chữ cũ không nằm lại.
// Chỉ đọc dữ liệu, không ghi gì nên chạy song song được.

test('ô tìm trên thanh đầu: có chữ ở trang Học sinh, trống khi sang trang khác', async ({ page }) => {
  await login(page);
  await page.goto('/tong-quan', { waitUntil: 'load' });
  const search = page.getByRole('searchbox', { name: 'Tìm học sinh' });
  await search.fill('Minh');
  await search.press('Enter');
  await expect(page).toHaveURL(/hoc-sinh\?q=Minh/);
  await expect(search).toHaveValue('Minh');
  // Sang trang khác bằng liên kết trong thanh bên: ô tìm trống
  await page.getByRole('link', { name: 'Tổng quan' }).first().click();
  await expect(page).toHaveURL(/tong-quan/);
  await expect(search).toHaveValue('');
});

test('ô tìm trên thanh đầu hiện đúng chữ khi mở trang Học sinh có ?q=', async ({ page }) => {
  await login(page);
  await page.goto('/hoc-sinh?q=Minh', { waitUntil: 'load' });
  await expect(page.getByRole('searchbox', { name: 'Tìm học sinh' })).toHaveValue('Minh');
});
