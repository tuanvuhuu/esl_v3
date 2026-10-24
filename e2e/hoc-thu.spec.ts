import { expect, test } from '@playwright/test';

// Vào học thử: không cần mật khẩu, mở thẳng bài mẫu, mỗi lần vào là làm từ đầu
test.describe('học thử không cần đăng nhập', () => {
  test('bấm nút trên trang đăng nhập thì vào thẳng bài học mẫu', async ({ page }) => {
    await page.goto('/dang-nhap');
    await page.getByRole('link', { name: 'Vào học thử, không cần đăng nhập' }).click();
    await page.waitForURL(/\/cua-toi\/\d+$/);
    // Câu hỏi xáo theo học sinh nên câu đầu không cố định: chỉ cần vào thẳng màn làm bài
    await expect(page.getByText(/^1\/\d+$/)).toBeVisible();
    // Khu học sinh có đủ bộ bài mẫu theo chủ đề
    await page.goto('/cua-toi');
    for (const topic of ['Animals', 'Colors & Numbers', 'My Family', 'Food & Drinks', 'At School']) {
      await expect(page.getByRole('link', { name: new RegExp(topic) })).toBeVisible();
    }
    await expect(page.getByText('Học thử', { exact: true })).toBeVisible();
    // Tài khoản học thử không có mật khẩu nên không có đổi mật khẩu
    await expect(page.getByRole('link', { name: 'Đổi mật khẩu' })).toHaveCount(0);
  });

  test('nộp bài rồi vào lại thì bài làm cũ được xoá', async ({ page }) => {
    await page.goto('/hoc-thu');
    await page.waitForURL(/\/cua-toi\/\d+$/);
    // Câu hỏi đã xáo: đi qua từng câu, gặp câu chọn chó con thì chọn đúng, các câu khác bỏ qua tới câu cuối
    const puppy = page.getByRole('button', { name: /Puppy/ });
    const done = page.getByRole('button', { name: /Xong bài/ });
    for (;;) {
      await expect(page.getByText(/^\d+\/\d+$/)).toBeVisible();
      if (await puppy.isVisible()) await puppy.click();
      if (await done.isVisible()) break;
      await page.getByRole('button', { name: /Tiếp tục/ }).click();
    }
    await done.click();
    // Chỉ đúng một câu tự chấm nên được 1 sao, có điểm phần tự chấm
    await expect(page.getByRole('img', { name: '1 trên 3 sao' })).toBeVisible();
    await expect(page.getByText(/^Đúng 1\/\d+ điểm phần tự chấm$/)).toBeVisible();

    await page.goto('/cua-toi');
    await expect(page.getByText('Đã nộp')).toHaveCount(1);
    await page.goto('/hoc-thu');
    await page.waitForURL(/\/cua-toi\/\d+$/);
    await page.goto('/cua-toi');
    await expect(page.getByText('Đã nộp')).toHaveCount(0);
  });
});
