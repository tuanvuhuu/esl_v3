import { expect, test } from '@playwright/test';
import { ACCOUNTANT, ADMIN, devPassword } from './env';
import { login } from './helpers';

test.describe('đăng nhập và phân quyền', () => {
  test('chưa đăng nhập thì bị chuyển về trang đăng nhập', async ({ page }) => {
    await page.goto('/tong-quan');
    await page.waitForURL('**/dang-nhap');
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  });

  test('sai mật khẩu thì báo lỗi chung và giữ email', async ({ page }) => {
    await page.goto('/dang-nhap');
    await page.getByLabel('Email').fill(ADMIN);
    await page.getByLabel('Mật khẩu').fill('sai-mat-khau-thu');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Email hoặc mật khẩu không đúng.' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue(ADMIN);
  });

  test('quản trị thấy đủ menu, kế toán không thấy mục hệ thống', async ({ page }) => {
    await login(page, ADMIN);
    await expect(page.getByRole('link', { name: 'Tài khoản & quyền' }).first()).toBeVisible();

    await page.context().clearCookies();
    await login(page, ACCOUNTANT);
    await expect(page.getByRole('link', { name: 'Báo cáo doanh thu' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tài khoản & quyền' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cài đặt', exact: true })).toHaveCount(0);

    await page.goto('/tai-khoan');
    await expect(page.getByRole('heading', { name: 'Tài khoản & quyền' })).toBeVisible();
    await expect(page.getByText('Bạn không có quyền xem màn này')).toBeVisible();
  });

  test('kế toán không đổi được ma trận quyền ngay cả khi gọi trực tiếp', async ({ page }) => {
    await login(page, ACCOUNTANT);
    await page.goto('/tai-khoan?tab=phan-quyen');
    await expect(page.getByText('Bạn không có quyền xem màn này')).toBeVisible();
  });

  test('đăng xuất thì quay về trang đăng nhập và không vào lại được', async ({ page }) => {
    await login(page, ADMIN);
    await page.getByRole('button', { name: 'Tài khoản' }).click();
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await page.waitForURL('**/dang-nhap');
    await page.goto('/hoc-sinh');
    await page.waitForURL('**/dang-nhap');
  });

  test('tài khoản bị khoá không đăng nhập được, mở khoá thì vào lại được', async ({ page }) => {
    const target = 'trang.giaovu@esl-center.vn';
    await login(page, ADMIN);
    await page.goto('/tai-khoan');
    await page.getByRole('button', { name: 'Thao tác với Nguyễn Thu Trang' }).click();
    await page.getByRole('menuitem', { name: 'Khoá tài khoản' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Đã khoá' })).toBeVisible();

    await page.getByRole('button', { name: 'Tài khoản' }).click();
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await page.waitForURL('**/dang-nhap');
    await page.getByLabel('Email').fill(target);
    await page.getByLabel('Mật khẩu').fill(devPassword());
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Tài khoản đang bị khoá' })).toBeVisible();

    await login(page, ADMIN);
    await page.goto('/tai-khoan');
    await page.getByRole('button', { name: 'Thao tác với Nguyễn Thu Trang' }).click();
    await page.getByRole('menuitem', { name: 'Mở khoá' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Đã mở khoá' })).toBeVisible();

    await page.getByRole('button', { name: 'Tài khoản' }).click();
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await page.waitForURL('**/dang-nhap');
    await login(page, target);
    await expect(page.getByRole('link', { name: 'Tổng quan' }).first()).toBeVisible();
  });

  // TẠM THỜI: đăng nhập nhanh theo vai trò (chỉ phát triển). Xoá cùng với tính năng.
  test('đăng nhập nhanh theo nhãn quyền vào đúng tài khoản', async ({ page }) => {
    await page.goto('/dang-nhap');
    await page.getByRole('button', { name: 'Kế toán', exact: true }).click();
    await page.waitForURL('**/tong-quan', { timeout: 60_000 });
    await expect(page.getByRole('link', { name: 'Báo cáo doanh thu' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tài khoản & quyền' })).toHaveCount(0);
  });

  test('mật khẩu dev đọc được từ .env.local', () => {
    expect(devPassword().length).toBeGreaterThan(8);
  });
});
