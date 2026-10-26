// Trợ giúp chung cho các kịch bản đầu cuối: đăng nhập, đọc thông báo, đếm dòng.
import { expect, type Locator, type Page } from '@playwright/test';
import { ADMIN, devPassword } from './env';

// Đăng nhập và chờ vào trang Tổng quan
export async function login(page: Page, email = ADMIN, password = devPassword()): Promise<void> {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('**/tong-quan', { timeout: 60_000 });
}

// Thông báo nhanh (role=status) hiện trên màn hình, lọc theo nội dung để không lấy nhầm phần tử khác
export function statusToast(page: Page, text?: string | RegExp): Locator {
  const toasts = page.locator('[role="status"]');
  return text === undefined ? toasts.last() : toasts.filter({ hasText: text });
}

// Lỗi của từng ô trong hộp thoại đang mở
export function dialogFieldErrors(page: Page): Locator {
  return page.locator('[role="dialog"] span.text-blush-ink');
}

// Hộp thoại có tiêu đề labelledBy cho trước
export function dialogById(page: Page, labelledBy: string): Locator {
  return page.locator(`[role="dialog"][aria-labelledby="${labelledBy}"]`);
}

// Nút ⋯ của một dòng (máy tính)
export function rowMenu(page: Page, label: string): Locator {
  return page.locator(`button[aria-label="${label}"]:visible`).first();
}

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(statusToast(page, text).first()).toBeVisible({ timeout: 15_000 });
}

// Chuỗi duy nhất cho dữ liệu thử, để chạy lại nhiều lần không trùng
export function uniq(prefix: string): string {
  return `${prefix} ${Date.now().toString().slice(-6)}`;
}

// Header gọi route cron Telegram: khoá CRON_SECRET gửi qua Authorization, không đặt trên URL
export function cronAuth(): { authorization: string } {
  return { authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` };
}
