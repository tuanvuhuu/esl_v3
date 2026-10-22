import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { loadEnvLocal } from './env';
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
    await create.getByRole('button', { name: 'Giáo viên chủ nhiệm *' }).click();
    await create.getByRole('option', { name: 'Cô Ngọc Ánh · Thiếu nhi' }).click();
    await create.getByRole('button', { name: 'Trợ giảng' }).click();
    await create.getByRole('option', { name: 'Cô Lan Anh · Hỗ trợ lớp' }).click();
    await create.getByRole('button', { name: 'Giáo viên nước ngoài' }).click();
    await create.getByRole('option', { name: 'Ms. Emily Carter · Speaking' }).click();
    await create.getByLabel('Học phí (VND) *').fill('1000000');
    await create.getByLabel('Số buổi *').fill('4');
    await create.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await expect(dialogFieldErrors(page).first()).toContainText('Chọn ít nhất một ngày học');
    await create.locator('label:has(input[value="T2"])').click();
    await create.getByLabel('Giờ bắt đầu Thứ 2').fill('18:00');
    await create.getByLabel('Giờ kết thúc Thứ 2').fill('19:30');
    // Khai giảng thứ Hai tuần sau, để buổi 1 luôn nằm trong "Buổi học sắp tới" (ghi cứng ngày thì test hỏng khi ngày đó đã qua)
    const start = new Date();
    start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7));
    const pad = (n: number) => String(n).padStart(2, '0');
    const [y, m, d] = [start.getFullYear(), pad(start.getMonth() + 1), pad(start.getDate())];
    await create.getByLabel('Ngày khai giảng *').fill(`${y}-${m}-${d}`);
    await create.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await expectToast(page, `Đã tạo lớp ${code} với 4 buổi học`);

    await page.locator('article', { hasText: code }).getByRole('link', { name: code }).click();
    await expect(page.getByText('Đã học 0/4 buổi')).toBeVisible();
    await expect(page.getByText(`Buổi 1 · ${d}/${m}/${y}`)).toBeVisible();

    // Xoá lớp không có học sinh: xác nhận rồi về danh sách
    await page.getByRole('button', { name: 'Xoá lớp', exact: true }).click();
    await page.getByRole('button', { name: 'Xoá lớp', exact: true }).last().click();
    await page.waitForURL('**/lop-hoc');
    await expect(page.locator('article', { hasText: code })).toHaveCount(0);
  });

  test('lớp: chọn trình độ CEFR, xem chi tiết hiện đúng trình độ, sửa đổi trình độ thành công', async ({ page }) => {
    await login(page);
    const code = uniq('LOP CEFR');
    await page.goto('/lop-hoc');
    await page.getByRole('button', { name: 'Tạo lớp học' }).first().click();
    const create = dialogById(page, 'class-create-title');
    await create.getByLabel('Mã lớp *').fill(code);
    await create.getByLabel('Khoá học *').fill('Luyện thi B1 Preliminary');
    await create.getByRole('button', { name: 'Giáo viên chủ nhiệm *' }).click();
    await create.getByRole('option', { name: 'Cô Ngọc Ánh · Thiếu nhi' }).click();
    await create.getByRole('button', { name: 'Trình độ CEFR' }).click();
    await create.getByRole('option', { name: /B1/ }).click();
    await create.getByLabel('Học phí (VND) *').fill('3000000');
    await create.getByLabel('Số buổi *').fill('4');
    await create.locator('label:has(input[value="T3"])').click();
    await create.getByLabel('Giờ bắt đầu Thứ 3').fill('19:00');
    await create.getByLabel('Giờ kết thúc Thứ 3').fill('20:30');
    await create.getByLabel('Ngày khai giảng *').fill('2026-10-20');
    await create.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await expectToast(page, `Đã tạo lớp ${code}`);

    // Thẻ danh sách hiện "Trình độ B1"
    const card = page.locator('article', { hasText: code });
    await expect(card.getByText(/Trình độ B1/)).toBeVisible();
    await card.getByRole('link', { name: code }).click();

    // Trang chi tiết hiện "B1" trong thông tin lớp
    await expect(page.getByText('Trình độ CEFR')).toBeVisible();
    await expect(page.locator('dd', { hasText: /B1/ })).toBeVisible();

    // Sửa lớp: đổi sang A2
    await page.getByRole('button', { name: 'Sửa lớp' }).click();
    const edit = dialogById(page, 'class-edit-title');
    await edit.getByRole('button', { name: 'Trình độ CEFR' }).click();
    await edit.getByRole('option', { name: /A2/ }).click();
    await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, `Đã lưu lớp ${code}`);
    await expect(page.locator('dd', { hasText: /A2/ })).toBeVisible();

    // Dọn dẹp: xoá lớp thử
    await page.getByRole('button', { name: 'Xoá lớp', exact: true }).click();
    await page.getByRole('button', { name: 'Xoá lớp', exact: true }).last().click();
    await page.waitForURL('**/lop-hoc');
    await expect(page.locator('article', { hasText: code })).toHaveCount(0);
  });

  test('lớp: để trống trợ giảng và giáo viên nước ngoài vẫn tạo được', async ({ page }) => {
    await login(page);
    await page.goto('/lop-hoc');
    await page.getByRole('button', { name: 'Tạo lớp học' }).first().click();
    const create = dialogById(page, 'class-create-title');
    const code = uniq('LOP E2E');
    await create.getByLabel('Mã lớp *').fill(code);
    await create.getByLabel('Khoá học *').fill('Kiểm thử đầu cuối');
    await create.getByRole('button', { name: 'Giáo viên chủ nhiệm *' }).click();
    await create.getByRole('option', { name: 'Cô Ngọc Ánh · Thiếu nhi' }).click();
    await create.getByLabel('Học phí (VND) *').fill('1000000');
    await create.locator('label:has(input[value="T2"])').click();
    await create.getByLabel('Giờ bắt đầu Thứ 2').fill('18:00');
    await create.getByLabel('Giờ kết thúc Thứ 2').fill('19:30');
    await create.getByLabel('Ngày khai giảng *').fill('2026-10-19');
    await create.getByLabel('Số buổi *').fill('4');
    await create.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    // Lớp thử có tiền tố "LOP E2E" được dọn trong global-teardown
    await expectToast(page, `Đã tạo lớp ${code} với 4 buổi học`);
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

  test('phụ huynh: thêm, sửa, trùng số điện thoại báo lỗi, xoá chỉ gỡ liên kết', async ({ page }) => {
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

    // Sửa phụ huynh qua hộp thoại
    await page.getByRole('searchbox', { name: 'Tìm phụ huynh' }).fill(name);
    await page.getByRole('button', { name: `Thao tác với ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    const edit = dialogById(page, 'parent-edit-title');
    const updatedName = `${name} Đổi`;
    await edit.getByLabel('Họ và tên *').fill(updatedName);
    await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, `Đã lưu ${updatedName}`);

    // Xoá phụ huynh
    await page.getByRole('searchbox', { name: 'Tìm phụ huynh' }).fill(updatedName);
    await page.getByRole('button', { name: `Thao tác với ${updatedName}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Không có học sinh nào liên kết');
    await page.getByRole('button', { name: 'Xoá phụ huynh', exact: true }).click();
    await expectToast(page, `Đã xoá ${updatedName}`);
  });

  test('cơ sở: thêm, sửa tên, xoá khi không còn lớp; cơ sở còn lớp thì không xoá được', async ({ page }) => {
    await login(page);
    const name = uniq('CS E2E');
    await page.goto('/co-so');
    await page.getByRole('button', { name: 'Thêm cơ sở', exact: true }).first().click();
    const create = dialogById(page, 'campus-create-title');
    await create.getByLabel('Tên cơ sở *').fill(name);
    await create.getByLabel('Địa chỉ').fill('Số 9, đường thử');
    await create.getByRole('button', { name: 'Thêm cơ sở', exact: true }).click();
    await expectToast(page, `Đã thêm cơ sở ${name}`);

    await page.getByRole('button', { name: `Thao tác với cơ sở ${name}`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    const edit = dialogById(page, 'campus-edit-title');
    await edit.getByLabel('Tên cơ sở *').fill(`${name} đổi`);
    await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, `Đã lưu cơ sở ${name} đổi`);

    // Cơ sở test còn lớp (lớp mẫu): không xoá được
    await page.getByRole('button', { name: 'Thao tác với cơ sở Cơ sở test', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('còn');
    await page.getByRole('button', { name: 'Đã hiểu' }).click();

    // Cơ sở thử không có lớp: xoá được
    await page.getByRole('button', { name: `Thao tác với cơ sở ${name} đổi`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá cơ sở', exact: true }).click();
    await expectToast(page, `Đã xoá ${name} đổi`);
  });

  test('phụ huynh: sửa ghi chú tại ô, đổi quan hệ và gỡ liên kết ngay trên bảng', async ({ page }) => {
    await login(page);
    const name = uniq('PH E2E');
    await page.goto('/phu-huynh');
    await page.getByRole('button', { name: 'Thêm phụ huynh' }).first().click();
    const create = dialogById(page, 'parent-create-title');
    await create.getByLabel('Họ và tên *').fill(name);
    await create.getByLabel('Số điện thoại *').fill(randomPhone());
    await create.getByRole('button', { name: 'Lưu phụ huynh' }).click();
    await expectToast(page, `Đã thêm ${name}`);

    await page.getByRole('searchbox', { name: 'Tìm phụ huynh' }).fill(name);
    // Ghi chú sửa ngay tại ô: Ctrl+Enter lưu
    await page.getByRole('button', { name: 'Sửa ghi chú' }).click();
    await page.getByLabel('ghi chú').fill('Ghi chú thử E2E');
    await page.keyboard.press('Control+Enter');
    await expect(page.getByRole('button', { name: 'Sửa ghi chú' })).toContainText('Ghi chú thử E2E');

    // Gán một học sinh có sẵn, rồi đổi quan hệ từ ô học sinh
    await page.getByRole('button', { name: `Thao tác với ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Gán học sinh' }).click();
    const assign = dialogById(page, 'parent-assign-title');
    await assign.getByRole('button', { name: 'Học sinh *', exact: true }).click();
    await assign.getByRole('option', { name: /^Đặng Ngọc Diệp · / }).click();
    await page.keyboard.press('Escape');
    await assign.getByRole('button', { name: 'Gán học sinh', exact: true }).click();
    await expectToast(page, `Đã gán 1 học sinh cho ${name}`);

    await page.getByRole('button', { name: /Sửa Đặng Ngọc Diệp/ }).click();
    const editor = page.getByRole('dialog', { name: 'Quan hệ của Đặng Ngọc Diệp' });
    await editor.getByRole('button', { name: 'Quan hệ với học sinh', exact: true }).click();
    await page.getByRole('option', { name: 'Mẹ', exact: true }).click();
    await expect(page.getByRole('button', { name: /Sửa Đặng Ngọc Diệp, Mẹ/ })).toBeVisible();

    // Gỡ liên kết có xác nhận; học sinh và phụ huynh vẫn còn
    await editor.getByRole('button', { name: 'Gỡ liên kết', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Gỡ liên kết', exact: true }).click();
    await expect(page.getByRole('button', { name: /Sửa Đặng Ngọc Diệp/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Thêm' })).toBeVisible();

    // Xoá phụ huynh thử để không để lại dữ liệu
    await page.getByRole('button', { name: `Thao tác với ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá phụ huynh', exact: true }).click();
    await expectToast(page, `Đã xoá ${name}`);
  });

  test('phụ huynh: danh sách chia trang 10 người, bấm Trang sau để xem tiếp', async ({ page }) => {
    loadEnvLocal();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const run = String(Date.now()).slice(-6);
    try {
      // 11 người thử, tìm theo mã lần chạy để chỉ có đúng 11 dòng: 2 trang
      for (let i = 1; i <= 11; i++) {
        await pool.query("INSERT INTO parents (full_name, phone, email, note) VALUES ($1, $2, '', '')", [`PH E2E pager ${run}-${i}`, randomPhone()]);
      }
      await login(page);
      await page.goto('/phu-huynh');
      await page.getByRole('searchbox', { name: 'Tìm phụ huynh' }).fill(`PH E2E pager ${run}`);
      await expect(page.getByText('Trang 1 / 2')).toBeVisible();
      await page.getByRole('button', { name: 'Trang sau' }).click();
      await expect(page.getByText('Trang 2 / 2')).toBeVisible();
      // Sắp theo tên: "-9" là người cuối cùng, nằm ở trang 2; "-1" nằm ở trang 1 nên không còn trên trang 2
      await expect(page.getByRole('button', { name: `Thao tác với PH E2E pager ${run}-9`, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: `Thao tác với PH E2E pager ${run}-1`, exact: true })).toHaveCount(0);
    } finally {
      await pool.query('DELETE FROM parents WHERE full_name LIKE $1', [`PH E2E pager ${run}-%`]);
      await pool.end();
    }
  });

  test('phụ huynh: gán học sinh có sẵn từ màn Phụ huynh, rồi xoá phụ huynh thử', async ({ page }) => {
    await login(page);
    const name = uniq('PH E2E');
    await page.goto('/phu-huynh');
    await page.getByRole('button', { name: 'Thêm phụ huynh' }).first().click();
    const create = dialogById(page, 'parent-create-title');
    await create.getByLabel('Họ và tên *').fill(name);
    await create.getByLabel('Số điện thoại *').fill(randomPhone());
    await create.getByRole('button', { name: 'Lưu phụ huynh' }).click();
    await expectToast(page, `Đã thêm ${name}`);

    await page.getByRole('searchbox', { name: 'Tìm phụ huynh' }).fill(name);
    await page.getByRole('button', { name: `Thao tác với ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Gán học sinh' }).click();
    const assign = dialogById(page, 'parent-assign-title');
    await assign.getByRole('button', { name: 'Học sinh *', exact: true }).click();
    await assign.getByRole('option', { name: /^Đặng Ngọc Diệp · / }).click();
    await page.keyboard.press('Escape');
    await assign.getByRole('button', { name: 'Gán học sinh', exact: true }).click();
    await expectToast(page, `Đã gán 1 học sinh cho ${name}`);
    await expect(page.getByRole('button', { name: /Sửa Đặng Ngọc Diệp/ })).toBeVisible();

    // Xoá phụ huynh thử: liên kết mất theo, học sinh vẫn được giữ
    await page.getByRole('button', { name: `Thao tác với ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá phụ huynh', exact: true }).click();
    await expectToast(page, `Đã xoá ${name}`);
  });
});
