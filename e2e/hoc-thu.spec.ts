import { expect, test } from '@playwright/test';

// Vào học thử: không cần mật khẩu, mở thẳng bài mẫu, mỗi lần vào là làm từ đầu
test.describe('học thử không cần đăng nhập', () => {
  test('bấm nút trên trang đăng nhập thì vào thẳng bài học mẫu', async ({ page }) => {
    await page.goto('/dang-nhap');
    await page.getByRole('link', { name: 'Vào học thử, không cần đăng nhập' }).click();
    await page.waitForURL(/\/cua-toi\/\d+$/);
    await expect(page.getByText('Which one is a puppy?')).toBeVisible();
    await expect(page.getByText('Học thử', { exact: true })).toBeVisible();
    // Tài khoản học thử không có mật khẩu nên không có đổi mật khẩu
    await expect(page.getByRole('link', { name: 'Đổi mật khẩu' })).toHaveCount(0);
  });

  test('nộp bài rồi vào lại thì bài làm cũ được xoá', async ({ page }) => {
    await page.goto('/hoc-thu');
    await page.waitForURL(/\/cua-toi\/\d+$/);
    await page.getByRole('button', { name: /Puppy/ }).click();
    for (let i = 0; i < 7; i++) await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByRole('button', { name: /Xong bài/ }).click();
    await expect(page.getByText('Xong bài rồi!')).toBeVisible();

    await page.goto('/cua-toi');
    await expect(page.getByText('Đã nộp')).toBeVisible();
    await page.goto('/hoc-thu');
    await page.waitForURL(/\/cua-toi\/\d+$/);
    await page.goto('/cua-toi');
    await expect(page.getByText('Chưa nộp')).toBeVisible();
  });
});
