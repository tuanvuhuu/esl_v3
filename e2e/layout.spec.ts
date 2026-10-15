import { expect, test } from '@playwright/test';
import { ACCOUNTANT, ADMIN } from './env';
import { login } from './helpers';

// Mọi màn hình phải không tràn ngang ở các độ rộng chuẩn (docs/DESIGN.md, CLAUDE.md mục 3)
const WIDTHS = [360, 390, 768, 1024, 1440, 1680, 2560];
const ROUTES = [
  '/tong-quan',
  '/tinh-nang',
  '/hoc-sinh',
  '/hoc-sinh/1',
  '/hoc-sinh/1?tab=phu-huynh',
  '/hoc-sinh/1?tab=hoc-tap',
  '/hoc-sinh?h=1',
  '/phu-huynh',
  '/lop-hoc',
  '/lop-hoc/1',
  '/lich-hoc',
  '/giao-vien',
  '/diem-danh',
  '/bai-tap',
  '/bai-tap/1',
  '/lich-su-hoc-tap',
  '/hoc-phi',
  '/bao-cao',
  '/cai-dat',
  '/tai-khoan',
  '/tai-khoan?tab=phan-quyen',
  '/tai-khoan?tab=nhat-ky',
];

// Mỗi độ rộng là một kịch bản riêng và chỉ đọc, nên chạy song song.
test.describe('bố cục không tràn ngang', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const width of WIDTHS) {
    test(`mọi màn hình ở ${width}px`, async ({ page }) => {
      await login(page, ADMIN);
      await page.setViewportSize({ width, height: 820 });
      const failures: string[] = [];
      for (const route of ROUTES) {
        // Không chờ networkidle: thêm khoảng 0,5 giây mỗi trang, không cần cho việc đo độ rộng
        await page.goto(route, { waitUntil: 'load' });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 0) failures.push(`${route}: tràn ${overflow}px`);
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});

test.describe('thanh tab điện thoại theo quyền', () => {
  test('kế toán không thấy tab Điểm danh; quản trị thấy đủ', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 820 });
    await login(page, ADMIN);
    await expect(page.getByRole('navigation', { name: 'Điều hướng nhanh' }).getByRole('link', { name: 'Điểm danh' })).toBeVisible();

    await page.context().clearCookies();
    await login(page, ACCOUNTANT);
    await expect(page.getByRole('navigation', { name: 'Điều hướng nhanh' }).getByRole('link', { name: 'Điểm danh' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Điều hướng nhanh' }).getByRole('link', { name: 'Cài đặt' })).toHaveCount(0);
  });
});
