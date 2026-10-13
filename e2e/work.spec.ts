import { expect, test } from '@playwright/test';

import { dialogById, dialogFieldErrors, expectToast, login, uniq } from './helpers';

test.describe('bài tập, điểm danh, học phí', () => {
  test('tạo bài tập, chấm điểm vượt mức bị chặn, xoá bài kèm bài nộp', async ({ page }) => {
    await login(page);
    const title = uniq('BT E2E');
    await page.goto('/bai-tap?cls=2'); // IELTS-K14
    await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
    const create = dialogById(page, 'assignment-create-title');
    await create.getByLabel('Tiêu đề *').fill(title);
    await create.getByLabel('Điểm tối đa *').fill('10');
    await create.getByLabel('Hạn nộp (ngày) *').fill('2026-10-20');
    await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
    await create.getByRole('button', { name: 'Tạo bài tập' }).click();
    await expectToast(page, `Đã tạo bài tập ${title}`);

    await page.getByRole('link', { name: title }).first().click();
    await page.waitForURL('**/bai-tap/*');
    const firstStatus = page.getByLabel(/Trạng thái của/).nth(0);
    await firstStatus.selectOption('graded');
    await page.getByLabel(/Điểm của/).nth(0).fill('11');
    await page.getByRole('button', { name: 'Lưu tất cả' }).click();
    await expectToast(page, 'phải là số nguyên từ 0 đến 10');
    await page.getByLabel(/Điểm của/).nth(0).fill('8');
    await page.getByRole('button', { name: 'Lưu tất cả' }).click();
    await expectToast(page, 'Đã lưu');

    // Sửa điểm tối đa xuống dưới điểm đã chấm: bị chặn
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    await dialogById(page, 'assignment-edit-title').getByLabel('Điểm tối đa *').fill('5');
    await dialogById(page, 'assignment-edit-title').getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(dialogById(page, 'assignment-edit-title').getByRole('alert')).toContainText('thấp hơn điểm đã chấm (8)');
    await expect(dialogById(page, 'assignment-edit-title').getByText('Tối thiểu 8')).toBeVisible();
    await page.keyboard.press('Escape');

    // Xoá: xác nhận, kèm số bài đã nộp
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('bài đã nộp hoặc đã chấm sẽ bị xoá');
    await page.getByRole('button', { name: 'Xoá bài tập', exact: true }).click();
    await expectToast(page, `Đã xoá bài tập ${title}`);
  });

  test('điểm danh: buổi chưa diễn ra thì khoá nút và báo lý do', async ({ page }) => {
    await login(page);
    await page.goto('/diem-danh?cls=1');
    const select = page.getByLabel('Chọn buổi học');
    const future = await select.locator('option', { hasText: '19/10/2026' }).getAttribute('value');
    await select.selectOption(future ?? '');
    await expect(page.getByText('Buổi này chưa diễn ra nên chưa điểm danh được.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu điểm danh' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Có mặt', exact: true }).first()).toBeDisabled();
  });

  test('điểm danh: có mặt cả lớp đếm đúng (không lưu)', async ({ page }) => {
    await login(page);
    // Buổi đã bắt đầu gần nhất của lớp TOEIC-T2 được chọn mặc định
    await page.goto('/diem-danh?cls=3');
    const rows = await page.locator('[role="table"][aria-label="Điểm danh học sinh"] [role="row"]').count();
    const roster = rows - 1; // trừ dòng tiêu đề
    await page.getByRole('button', { name: 'Có mặt cả lớp' }).click();
    await expect(page.getByText(`Có mặt ${roster}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Chưa điểm danh 0', { exact: true })).toBeVisible();
    // Không bấm Lưu: dữ liệu không đổi
  });

  test('học phí: không thu quá số còn nợ, nhắc đóng có thông báo', async ({ page }) => {
    await login(page);
    await page.goto('/hoc-phi?f=unpaid');
    await page.getByRole('button', { name: 'Ghi thu' }).first().click();
    const dialog = page.locator('[role="dialog"][aria-labelledby="payment-title"]');
    await dialog.locator('input[name="amount"]').fill('999999999999');
    await dialog.getByRole('button', { name: 'Ghi nhận thu' }).click();
    await expect(dialogFieldErrors(page).first()).toContainText('Tối đa');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Nhắc', exact: true }).first().click();
    await expectToast(page, 'Đã ghi nhắc đóng');
  });

  test('cài đặt: hạn đóng ngoài 1–28 bị chặn', async ({ page }) => {
    await login(page);
    await page.goto('/cai-dat');
    await page.locator('input[name="dueDay"]').fill('40');
    await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
    await expect(page.getByText('Ngày đến hạn từ 1 đến 28')).toBeVisible();
    await expect(page.locator('input[name="dueDay"]')).toHaveValue('40');
    await page.locator('input[name="dueDay"]').fill('10');
  });

  test('lịch học: chuyển tuần và mở buổi đã học chỉ để xem', async ({ page }) => {
    await login(page);
    await page.goto('/lich-hoc?w=2026-10-12');
    await expect(page.getByText(/Tuần 12\/10\/2026 – 18\/10\/2026/)).toBeVisible();
    await page.getByRole('link', { name: 'Tuần sau' }).click();
    await expect(page.getByText(/Tuần 19\/10\/2026 – 25\/10\/2026/)).toBeVisible();
    await page.goto('/lich-hoc?w=2026-10-12');
    await page.locator('button:visible', { hasText: 'Đã học' }).first().click();
    await expect(page.getByText('đã học xong nên không sửa được')).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
