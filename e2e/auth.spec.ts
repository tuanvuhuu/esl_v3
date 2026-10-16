import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { hashPassword } from '../src/lib/auth/password';
import { ACCOUNTANT, ADMIN, devPassword, loadEnvLocal } from './env';
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

  test('đổi mật khẩu: sai mật khẩu cũ báo lỗi; đổi xong thiết bị khác bị đăng xuất và chỉ mật khẩu mới vào được', async ({ page, browser }) => {
    // Tài khoản thử riêng, xoá ở cuối kịch bản
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const stamp = Date.now();
    const email = `e2e-doi-mk-${stamp}@esl-center.vn`;
    const oldPassword = `cu-${stamp}-mat-khau`;
    const newPassword = `moi-${stamp}-mat-khau`;
    const otherDevice = await browser.newContext();
    const freshDevice = await browser.newContext();
    try {
      await db.query(`insert into accounts (full_name, email, role, status, password_hash) values ('E2E đổi mật khẩu', $1, 'academic', 'active', $2)`, [
        email,
        await hashPassword(oldPassword),
      ]);
      // Hai phiên: trình duyệt này và một thiết bị khác
      await login(page, email, oldPassword);
      const otherPage = await otherDevice.newPage();
      await login(otherPage, email, oldPassword);

      await page.goto('/doi-mat-khau');
      await page.locator('input[name="currentPassword"]').fill('sai-hoan-toan-1');
      await page.locator('input[name="newPassword"]').fill(newPassword);
      await page.locator('input[name="confirmPassword"]').fill(newPassword);
      await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
      await expect(page.getByText('Mật khẩu hiện tại không đúng', { exact: true })).toBeVisible();

      await page.locator('input[name="currentPassword"]').fill(oldPassword);
      await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
      await expect(page.getByText('Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.')).toBeVisible();
      await expect(page.locator('input[name="currentPassword"]')).toHaveValue('');

      // Thiết bị khác: phiên cũ không còn hiệu lực
      await otherPage.goto('/tong-quan');
      await otherPage.waitForURL('**/dang-nhap');

      // Mật khẩu cũ không vào được, mật khẩu mới vào được
      const freshPage = await freshDevice.newPage();
      await freshPage.goto('/dang-nhap');
      await freshPage.getByLabel('Email').fill(email);
      await freshPage.getByLabel('Mật khẩu').fill(oldPassword);
      await freshPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await expect(freshPage.getByRole('alert').filter({ hasText: 'Email hoặc mật khẩu không đúng.' })).toBeVisible();
      await login(freshPage, email, newPassword);
      await expect(freshPage.getByRole('link', { name: 'Tổng quan' }).first()).toBeVisible();

      // Thiết bị đã đổi mật khẩu vẫn ở lại trang, vì được cấp phiên mới
      await page.goto('/tong-quan');
      await page.waitForURL('**/tong-quan');
    } finally {
      await otherDevice.close();
      await freshDevice.close();
      await db.query('delete from accounts where email = $1', [email]);
      await db.end();
    }
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
