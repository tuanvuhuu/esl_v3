import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Xếp lịch dễ cho giáo vụ: ô giờ 24 giờ, học phí có dấu chấm, xem trước lịch, chặn trùng giáo viên và phòng,
// thêm buổi học bù ở màn Lịch học. Lớp thử ở tháng 3/2027 (không đụng lịch thật), chưa có học sinh nên không gửi Telegram.
const stamp = String(Date.now()).slice(-5);
const A = `XL-A${stamp}`;
const B = `XL-B${stamp}`;

async function openCreate(page: Page) {
  await page.goto('/lop-hoc');
  await page.getByRole('button', { name: 'Tạo lớp học' }).click();
  return page.getByRole('dialog');
}

async function fillClass(page: Page, name: string, start: string, room: string) {
  const d = await openCreate(page);
  await d.locator('input[name="name"]').fill(name);
  await d.locator('input[name="course"]').fill('E2E xếp lịch');
  await d.getByRole('button', { name: 'Giáo viên chủ nhiệm *' }).click();
  await page.getByRole('option').filter({ hasNotText: 'Chọn giáo viên' }).first().click();
  await d.locator('input[name="room"]').fill(room);
  await d.getByLabel('Học phí (VND) *').fill('4500000');
  await d.locator('label:has(input[value="T3"])').click();
  await d.getByLabel('Giờ bắt đầu Thứ 3', { exact: true }).fill(start);
  await d.locator('input[name="startDate"]').fill('2027-03-02');
  await d.locator('input[name="sessionsTotal"]').fill('3');
  return d;
}

test('tạo lớp: giờ 24 giờ, học phí có dấu chấm, xem trước lịch; trùng giáo viên thì chặn; thêm buổi học bù', async ({ page }) => {
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await login(page);

    // Lớp A: gõ "1000" thành 10:00, giờ kết thúc dời theo giữ độ dài ca; học phí hiện 4.500.000
    let d = await fillClass(page, A, '1000', 'XL-P1');
    await expect(d.getByLabel('Giờ bắt đầu Thứ 3', { exact: true })).toHaveValue('10:00');
    await expect(d.getByLabel('Giờ kết thúc Thứ 3', { exact: true })).toHaveValue('11:30');
    await expect(d.getByText('1 giờ 30 phút')).toBeVisible();
    await expect(d.getByLabel('Học phí (VND) *')).toHaveValue('4.500.000');
    const preview = d.getByRole('region', { name: 'Xem trước lịch' });
    await expect(preview).toContainText('3 buổi · từ T3 02/03/2027 10:00 đến T3 16/03/2027 10:00');
    await expect(preview.getByText('Không trùng lịch giáo viên và phòng.')).toBeVisible();
    await d.getByRole('button', { name: 'Tạo lớp' }).click();
    await expectToast(page, `Đã tạo lớp ${A} với 3 buổi học`);
    const [a] = (await db.query<{ id: number; fee: number }>('select id, fee from classes where name = $1', [A])).rows;
    expect(Number(a.fee)).toBe(4_500_000);

    // Lớp B cùng giáo viên, giờ chồng lên lớp A: xem trước báo trùng, bấm tạo thì bị chặn
    d = await fillClass(page, B, '1100', 'XL-P2');
    await expect(d.getByRole('region', { name: 'Xem trước lịch' })).toContainText(`đang dạy lớp ${A} 10:00–11:30 các ngày T3 02/03, T3 09/03, T3 16/03`);
    await d.getByRole('button', { name: 'Tạo lớp' }).click();
    await expect(d.getByRole('alert').first()).toContainText('Lịch bị trùng 3 buổi');
    expect((await db.query('select 1 from classes where name = $1', [B])).rowCount).toBe(0);
    // Đổi sang 14:00 thì tạo được
    await d.getByLabel('Giờ bắt đầu Thứ 3', { exact: true }).fill('14:00');
    await expect(d.getByRole('region', { name: 'Xem trước lịch' }).getByText('Không trùng lịch giáo viên và phòng.')).toBeVisible();
    await d.getByRole('button', { name: 'Tạo lớp' }).click();
    await expectToast(page, `Đã tạo lớp ${B} với 3 buổi học`);

    // Thêm buổi học bù cho lớp A ở màn Lịch học: trùng phòng thì báo, đổi giờ thì thêm được, số buổi đánh lại theo ngày
    await page.goto('/lich-hoc?w=2027-03-01&to=2027-03-07');
    await page.getByRole('button', { name: 'Thêm buổi' }).click();
    const add = page.getByRole('dialog', { name: 'Thêm buổi học' });
    await add.getByRole('button', { name: 'Lớp của buổi học' }).click();
    await page.getByRole('option', { name: A, exact: true }).click();
    await add.locator('input[name="date"]').fill('2027-03-04');
    await add.locator('input[name="room"]').fill('XL-P2');
    await add.locator('input[name="startTime"]').fill('1300');
    await expect(add.locator('input[name="endTime"]')).toHaveValue('14:30');
    await add.locator('input[name="date"]').fill('2027-03-02');
    await expect(add.getByText(/Trùng lịch:/)).toBeVisible();
    await add.locator('input[name="date"]').fill('2027-03-04');
    await expect(add.getByText('Không trùng lịch giáo viên, phòng và lớp.')).toBeVisible();
    await add.getByRole('button', { name: 'Thêm buổi' }).click();
    await expectToast(page, `Đã thêm buổi cho lớp ${A} ngày 04/03/2027 13:00`);
    const rows = (await db.query<{ session_no: number; topic: string }>('select session_no, topic from class_sessions where class_id = $1 order by starts_at', [a.id])).rows;
    expect(rows.map((r) => r.session_no)).toEqual([1, 2, 3, 4]);
    expect(rows[1].topic).toBe('Buổi học bù');

    // Xếp lại lịch lớp A: khai giảng lùi sang 09/03, thêm T5, tổng 5 buổi. Buổi chưa học cũ (kể cả buổi bù) được thay hết.
    await page.goto(`/lop-hoc/${a.id}`);
    await page.getByRole('button', { name: 'Xếp lại lịch' }).click();
    const r = page.getByRole('dialog', { name: `Xếp lại lịch lớp ${A}` });
    await expect(r.getByLabel('Giờ bắt đầu Thứ 3', { exact: true })).toHaveValue('10:00');
    await r.locator('label:has(input[value="T5"])').click();
    await r.locator('input[name="startDate"]').fill('2027-03-09');
    await r.locator('input[name="sessionsTotal"]').fill('5');
    // Ngày T5 vừa bật lấy giờ của lớp (10:00), không phải giờ mặc định
    await expect(r.getByLabel('Giờ bắt đầu Thứ 5', { exact: true })).toHaveValue('10:00');
    await expect(r.getByRole('region', { name: 'Xem trước lịch' })).toContainText('5 buổi · từ T3 09/03/2027 10:00 đến T3 23/03/2027 10:00');
    await r.getByRole('button', { name: 'Xếp lại lịch' }).click();
    await expectToast(page, `Đã xếp lại lịch lớp ${A}, 5 buổi từ 09/03/2027 đến 23/03/2027`);
    const after = (await db.query<{ session_no: number; d: string }>(`select session_no, to_char(starts_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') d from class_sessions where class_id = $1 order by starts_at`, [a.id])).rows;
    expect(after.map((x) => x.d)).toEqual(['2027-03-09 10:00', '2027-03-11 10:00', '2027-03-16 10:00', '2027-03-18 10:00', '2027-03-23 10:00']);
    expect(after.map((x) => x.session_no)).toEqual([1, 2, 3, 4, 5]);
    const [cls] = (await db.query<{ weekdays: string; sessions_total: number }>('select weekdays, sessions_total from classes where id = $1', [a.id])).rows;
    expect(cls).toEqual({ weekdays: 'T3,T5', sessions_total: 5 });
  } finally {
    await db.query('delete from classes where name = any($1)', [[A, B]]);
    await db.end();
  }
});
