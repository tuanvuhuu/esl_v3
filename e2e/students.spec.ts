import { expect, test } from '@playwright/test';
import { dialogById, dialogFieldErrors, expectToast, login, rowMenu, uniq } from './helpers';

// Số điện thoại 10 số ngẫu nhiên, bắt đầu bằng 09, để không trùng dữ liệu cũ
function randomPhone(): string {
  return `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
}

test.describe('học sinh: thêm, sửa, xoá', () => {
  test('thêm học sinh mới, chuyển lớp (có sự kiện lịch sử), xoá có xác nhận', async ({ page }) => {
    await login(page);
    const name = uniq('HS E2E');
    const parent = uniq('PH E2E');

    await page.goto('/hoc-sinh');
    await page.getByRole('button', { name: 'Thêm học sinh' }).first().click();
    const create = dialogById(page, 'create-title');
    await create.getByLabel('Họ và tên *').fill(name);
    await create.getByLabel('Ngày sinh *').fill('2015-03-01');
    await create.locator('input[name="parentName"]').fill(parent);
    await create.locator('input[name="parentPhone"]').fill(randomPhone());
    await create.getByRole('button', { name: 'Lưu học sinh' }).click();
    await expectToast(page, `Đã thêm ${name}`);

    // Tìm đúng học sinh vừa tạo qua ô tìm kiếm trên URL
    await page.goto(`/hoc-sinh?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();

    // Chuyển lớp: sửa từ ⋯ của dòng
    await rowMenu(page, `Thao tác với ${name}`).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    const edit = dialogById(page, 'edit-title');
    await edit.getByRole('button', { name: 'Lớp học *' }).click();
    await edit.getByRole('option', { name: 'TOEIC-T2 — TOEIC 600+' }).click();
    await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, `Đã chuyển ${name} sang TOEIC-T2`);

    // Hồ sơ mở trong ngăn kéo (máy tính): tab Học tập có sự kiện chuyển lớp
    await page.goto(`/hoc-sinh?q=${encodeURIComponent(name)}`);
    await rowMenu(page, `Thao tác với ${name}`).click();
    await page.getByRole('menuitem', { name: 'Xem hồ sơ' }).click();
    await page.waitForURL(/h=\d+/);
    const drawer = page.locator('aside[aria-label="Hồ sơ học sinh"]');
    await drawer.getByRole('navigation', { name: 'Mục hồ sơ' }).getByRole('link', { name: 'Học tập', exact: true }).click();
    await expect(drawer.getByText(/Chuyển từ .* sang TOEIC-T2/)).toBeVisible();

    // Xoá: hộp xác nhận, Huỷ thì giữ nguyên, Xoá thì mất
    await page.goto(`/hoc-sinh?q=${encodeURIComponent(name)}`);
    await rowMenu(page, `Thao tác với ${name}`).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Huỷ', exact: true }).click();
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();

    await rowMenu(page, `Thao tác với ${name}`).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá học sinh', exact: true }).click();
    await expectToast(page, `Đã xoá ${name}`);
  });

  test('form học sinh báo lỗi trong ô và giữ dữ liệu đã nhập', async ({ page }) => {
    await login(page);
    await page.goto('/hoc-sinh');
    await page.getByRole('button', { name: 'Thêm học sinh' }).first().click();
    const create = dialogById(page, 'create-title');
    await create.getByLabel('Họ và tên *').fill('Một');
    await create.locator('input[name="parentPhone"]').fill('0912');
    await create.getByRole('button', { name: 'Lưu học sinh' }).click();
    await expect(dialogFieldErrors(page).first()).toBeVisible();
    await expect(create.getByLabel('Họ và tên *')).toHaveValue('Một');
    await expect(create.locator('input[name="parentPhone"]')).toHaveValue('0912');
  });
});
