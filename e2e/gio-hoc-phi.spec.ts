// Lớp hai buổi khác giờ, học sinh vào giữa khoá đóng học phí theo số buổi còn lại, mã học sinh 5 chữ số.
// Không gửi tin Telegram: tạo, sửa lớp và thêm học sinh không phát thông báo; lớp thử không có phụ huynh kết nối (E-081).
import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { dialogById, expectToast, login, uniq } from './helpers';

// Khoá ngày YYYY-MM-DD theo giờ Việt Nam, cách hôm nay n ngày (không ghi cứng ngày, E-073)
function vnKey(offsetDays = 0): string {
  return new Date(Date.now() + 7 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

test('lớp T3 18:00 và T7 06:30: sinh buổi đúng giờ, sửa giờ T7, học sinh vào giữa khoá, tìm theo mã cũ', async ({ page }) => {
  test.setTimeout(180_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const code = uniq('LOP E2E GIO');
  const name = uniq('HS E2E GIO');
  let classId = 0;
  try {
    // Dọn bản sót của lần chạy trước (E-082)
    await db.query("DELETE FROM students WHERE full_name LIKE 'HS E2E GIO%'");
    await db.query("DELETE FROM classes WHERE name LIKE 'LOP E2E GIO%'");

    await login(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/lop-hoc');
    await page.getByRole('button', { name: 'Tạo lớp học' }).first().click();
    const create = dialogById(page, 'class-create-title');
    await create.getByLabel('Mã lớp *').fill(code);
    await create.getByLabel('Khoá học *').fill('Kiểm thử giờ');
    await create.getByRole('button', { name: 'Giáo viên chủ nhiệm *' }).click();
    await create.getByRole('option', { name: 'Cô Ngọc Ánh · Thiếu nhi' }).click();
    await create.getByLabel('Học phí (VND) *').fill('2400000');
    await create.locator('label:has(input[value="T3"])').click();
    await create.locator('label:has(input[value="T7"])').click();
    // Sửa giờ T3 thì T7 (chưa sửa) đi theo; sau đó đặt riêng giờ T7
    await create.getByLabel('Giờ bắt đầu Thứ 3').fill('18:00');
    await create.getByLabel('Giờ kết thúc Thứ 3').fill('19:30');
    await expect(create.getByLabel('Giờ bắt đầu Thứ 7')).toHaveValue('18:00');
    // T7 sáng sớm 06:30 để không trùng lịch có sẵn của giáo viên (form chặn lịch trùng)
    await create.getByLabel('Giờ bắt đầu Thứ 7').fill('06:30');
    await create.getByLabel('Giờ kết thúc Thứ 7').fill('06:00');
    await expect(create.getByText('Giờ kết thúc phải sau giờ bắt đầu')).toBeVisible();
    await create.getByLabel('Giờ kết thúc Thứ 7').fill('08:00');
    await expect(create.getByText(/Lịch có giờ khác nhau: T3 18:00–19:30 · T7 06:30–08:00/)).toBeVisible();
    // Khai giảng hai tuần trước, để có buổi đã qua và buổi còn lại
    await create.getByLabel('Ngày khai giảng *').fill(vnKey(-14));
    await create.getByLabel('Số buổi *').fill('8');
    await create.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await expectToast(page, `Đã tạo lớp ${code} với 8 buổi học`);

    const card = page.locator('article', { hasText: code });
    await expect(card.getByText('T3 18:00–19:30 · T7 06:30–08:00')).toBeVisible();
    classId = (await db.query<{ id: number }>('SELECT id FROM classes WHERE name = $1', [code])).rows[0].id;
    const times = async () =>
      (
        await db.query<{ dow: number; t: string; future: boolean }>(
          `SELECT EXTRACT(ISODOW FROM starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS dow,
                  to_char(starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') || '-' || to_char(ends_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') AS t,
                  starts_at > now() AS future
           FROM class_sessions WHERE class_id = $1 ORDER BY starts_at`,
          [classId],
        )
      ).rows;
    const created = await times();
    expect(created).toHaveLength(8);
    for (const s of created) expect(s.t).toBe(s.dow === 2 ? '18:00-19:30' : '06:30-08:00');

    // Sửa lớp: đổi giờ T7 sang 09:00–10:30. Buổi T7 sắp tới dời giờ, buổi đã qua giữ nguyên.
    await card.getByRole('link', { name: code }).click();
    await page.getByRole('button', { name: 'Sửa lớp' }).click();
    const edit = dialogById(page, 'class-edit-title');
    await expect(edit.getByLabel('Giờ bắt đầu Thứ 3')).toHaveValue('18:00');
    await edit.getByLabel('Giờ bắt đầu Thứ 7').fill('09:00');
    await edit.getByLabel('Giờ kết thúc Thứ 7').fill('10:30');
    await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, new RegExp(`Đã lưu lớp ${code}`));
    await expect.poll(async () => (await times()).filter((s) => s.dow === 6 && s.future).every((s) => s.t === '09:00-10:30')).toBe(true);
    const edited = await times();
    for (const s of edited.filter((x) => x.dow === 6 && !x.future)) expect(s.t).toBe('06:30-08:00');
    for (const s of edited.filter((x) => x.dow === 2)) expect(s.t).toBe('18:00-19:30');
    await expect(page.getByText('T3 18:00–19:30 · T7 09:00–10:30')).toBeVisible();

    // Học sinh vào giữa khoá từ hôm nay: số buổi còn lại tính từ DB, học phí = 2.400.000 ÷ 8 × còn lại
    const today = vnKey();
    const remaining = (
      await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM class_sessions WHERE class_id = $1 AND status <> 'cancelled' AND starts_at >= ($2::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
        [classId, today],
      )
    ).rows[0].n;
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(8);
    const expectedFee = Math.round((2_400_000 * remaining) / 8 / 1000) * 1000;

    await page.goto('/hoc-sinh');
    await page.getByRole('button', { name: 'Thêm học sinh' }).first().click();
    const add = dialogById(page, 'create-title');
    await add.getByRole('button', { name: 'Lớp học *' }).click();
    await add.getByRole('option', { name: `${code} — Kiểm thử giờ` }).click();
    await add.getByLabel('Ngày bắt đầu học *').fill(today);
    await expect(add.getByTestId('fee-suggestion')).toContainText(`còn ${remaining}/8 buổi`);
    await expect(add.getByLabel('Học phí của học sinh (VND)')).toHaveValue(String(expectedFee));
    await expect(add.getByTestId('class-info')).toContainText('8 buổi · Khai giảng');
    // Người nhập sửa số rồi bấm "Dùng số này" để lấy lại số gợi ý
    await add.getByLabel('Học phí của học sinh (VND)').fill('999000');
    await add.getByRole('button', { name: 'Dùng số này' }).click();
    await expect(add.getByLabel('Học phí của học sinh (VND)')).toHaveValue(String(expectedFee));
    await add.getByLabel('Họ và tên *').fill(name);
    await add.locator('input[name="dob"]').fill('2015-03-01');
    await add.locator('input[name="parentName"]').fill(uniq('PH E2E GIO'));
    await add.locator('input[name="parentPhone"]').fill(`09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`);
    await add.getByRole('button', { name: 'Lưu học sinh' }).click();
    await expectToast(page, `Đã thêm ${name}`);

    const student = (await db.query<{ id: number; tuition_fee: number | null; start_date: string }>(
      'SELECT id, tuition_fee, start_date::text FROM students WHERE full_name = $1',
      [name],
    )).rows[0];
    expect(student.tuition_fee).toBe(expectedFee);
    expect(student.start_date).toBe(today);

    // Mã hiển thị 5 chữ số; tìm bằng mã cũ 4 chữ số vẫn ra đúng học sinh (id < 10000)
    const newCode = `HS-${String(student.id).padStart(5, '0')}`;
    const oldCode = `HS-${String(student.id).padStart(4, '0')}`;
    await page.goto(`/hoc-phi?q=${encodeURIComponent(oldCode)}`);
    await expect(page.getByText(`${newCode} · ${code}`).first()).toBeVisible();
    await expect(page.getByText(new Intl.NumberFormat('vi-VN').format(expectedFee)).first()).toBeVisible();
  } finally {
    await db.query('DELETE FROM students WHERE full_name = $1', [name]);
    await db.query("DELETE FROM parents WHERE full_name LIKE 'PH E2E GIO%'");
    if (classId) await db.query('DELETE FROM classes WHERE id = $1', [classId]);
    await db.end();
  }
});
