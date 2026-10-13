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

test.describe('bố cục không tràn ngang', () => {
  test('mọi màn hình ở 360 đến 2560px', async ({ page }) => {
    await login(page, ADMIN);
    const failures: string[] = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 820 });
      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle').catch(() => undefined);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 0) failures.push(`${width}px ${route}: tràn ${overflow}px`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
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
