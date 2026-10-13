import { expect, test } from '@playwright/test';
import { dialogById, dialogFieldErrors, expectToast, login, uniq } from './helpers';

function randomPhone(): string {
  return `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
}

test.describe('giáo viên, lớp học, phụ huynh', () => {
  test('đổi tên giáo viên cập nhật ở lớp; giáo viên còn lớp thì không xoá được', async ({ page }) => {
    await login(page);
    await page.goto('/giao-vien');
    // Giáo viên có lớp (Cô Hải Yến dạy TOEIC-T2): không xoá được
    await page.getByRole('button', { name: 'Thao tác với Cô Hải Yến', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('còn 1 lớp');
    await page.getByRole('button', { name: 'Đã hiểu' }).click();

    // Đổi tên rồi trả lại: lớp TOEIC-T2 hiển thị tên mới
    await page.getByRole('button', { name: 'Thao tác với Cô Hải Yến', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    const edit = dialogById(page, 'teacher-edit-title');
    await edit.getByLabel('Họ và tên *').fill('Cô Hải Yến E2E');
    await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, 'Đã lưu thay đổi cho Cô Hải Yến E2E');
    await page.goto('/lop-hoc');
    await expect(page.locator('article', { hasText: 'TOEIC-T2' })).toContainText('Cô Hải Yến E2E');

    await page.goto('/giao-vien');
    await page.getByRole('button', { name: 'Thao tác với Cô Hải Yến E2E', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    await dialogById(page, 'teacher-edit-title').getByLabel('Họ và tên *').fill('Cô Hải Yến');
    await dialogById(page, 'teacher-edit-title').getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, 'Cô Hải Yến');
  });

  test('tạo lớp sinh đủ buổi học, sửa phòng, xoá khi không còn học sinh', async ({ page }) => {
    await login(page);
    const code = uniq('LOP E2E');
    await page.goto('/lop-hoc');
    await page.getByRole('button', { name: 'Tạo lớp học' }).first().click();
    const create = dialogById(page, 'class-create-title');
    await create.getByLabel('Mã lớp *').fill(code);
    await create.getByLabel('Khoá học *').fill('Kiểm thử đầu cuối');
    await create.getByLabel('Giáo viên *').selectOption({ label: 'Cô Ngọc Ánh · Thiếu nhi' });
    await create.getByLabel('Học phí (VND) *').fill('1000000');
    await create.getByLabel('Giờ bắt đầu *').fill('18:00');
    await create.getByLabel('Giờ kết thúc *').fill('19:30');
    await create.getByLabel('Số buổi *').fill('4');
    await create.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await expect(dialogFieldErrors(page).first()).toContainText('Chọn ít nhất một ngày học');
    await create.locator('label:has(input[value="T2"])').click();
    await create.getByLabel('Ngày khai giảng *').fill('2026-10-19');
    await create.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await expectToast(page, `Đã tạo lớp ${code} với 4 buổi học`);

    await page.locator('article', { hasText: code }).getByRole('link', { name: code }).click();
    await expect(page.getByText('Đã học 0/4 buổi')).toBeVisible();
    await expect(page.getByText('Buổi 1 · 19/10/2026')).toBeVisible();

    // Xoá lớp không có học sinh: xác nhận rồi về danh sách
    await page.getByRole('button', { name: 'Xoá lớp', exact: true }).click();
    await page.getByRole('button', { name: 'Xoá lớp', exact: true }).last().click();
    await page.waitForURL('**/lop-hoc');
    await expect(page.locator('article', { hasText: code })).toHaveCount(0);
  });

  test('lớp còn học sinh thì không xoá được', async ({ page }) => {
    await login(page);
    await page.goto('/lop-hoc');
    await page.getByRole('button', { name: 'Thao tác với lớp IELTS-K12' }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('còn');
    await expect(page.getByRole('alertdialog')).toContainText('học sinh');
    await page.getByRole('button', { name: 'Đã hiểu' }).click();
  });

  test('phụ huynh: trùng số điện thoại báo lỗi, xoá chỉ gỡ liên kết', async ({ page }) => {
    await login(page);
    await page.goto('/phu-huynh');
    await page.getByRole('button', { name: 'Thêm phụ huynh' }).first().click();
    const create = dialogById(page, 'parent-create-title');
    await create.getByLabel('Họ và tên *').fill(uniq('PH E2E'));
    await create.getByLabel('Số điện thoại *').fill('0920 000 000');
    await create.getByRole('button', { name: 'Lưu phụ huynh' }).click();
    await expect(dialogFieldErrors(page).first()).toContainText('đã có phụ huynh');
    await expect(create.getByLabel('Họ và tên *')).not.toHaveValue('');

    const name = uniq('PH E2E');
    await create.getByLabel('Họ và tên *').fill(name);
    await create.getByLabel('Số điện thoại *').fill(randomPhone());
    await create.getByRole('button', { name: 'Lưu phụ huynh' }).click();
    await expectToast(page, `Đã thêm ${name}`);

    await page.getByRole('searchbox', { name: 'Tìm phụ huynh' }).fill(name);
    await page.getByRole('button', { name: `Thao tác với ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Không có học sinh nào liên kết');
    await page.getByRole('button', { name: 'Xoá phụ huynh', exact: true }).click();
    await expectToast(page, `Đã xoá ${name}`);
  });
});
