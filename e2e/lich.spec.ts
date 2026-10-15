import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Chọn khoảng ngày trên lịch học (DESIGN mục 10): bấm ngày bắt đầu rồi ngày kết thúc. Nút lịch hiện khoảng đang xem.
// Lớp và giáo viên chọn nhiều, trên URL viết "1,2". Chỉ đọc dữ liệu, không ghi gì nên chạy song song được.

test('lịch học: lùi, khoảng ngày, tiến nằm cùng một hàng theo thứ tự', async ({ page }) => {
  await login(page);
  await page.goto('/lich-hoc?w=2026-10-12', { waitUntil: 'load' });
  const prev = await page.getByRole('link', { name: 'Khoảng trước' }).boundingBox();
  const calendar = await page.getByRole('button', { name: /Chọn khoảng ngày/ }).boundingBox();
  const next = await page.getByRole('link', { name: 'Khoảng sau' }).boundingBox();
  if (!prev || !calendar || !next) throw new Error('Không đo được thanh điều hướng');
  expect(prev.x).toBeLessThan(calendar.x);
  expect(calendar.x).toBeLessThan(next.x);
  expect(Math.abs(prev.y - calendar.y)).toBeLessThan(2);
  await expect(page.getByRole('link', { name: 'Tuần này' })).toHaveCount(0);
});

test('lịch học: chọn khoảng ngày bằng hai lần bấm, nút hiện khoảng đó và giữ bộ lọc lớp', async ({ page }) => {
  await login(page);
  await page.goto('/lich-hoc?w=2026-10-12&cls=1', { waitUntil: 'load' });
  await page.getByRole('button', { name: /Chọn khoảng ngày/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Chọn khoảng ngày' });
  await expect(dialog).toBeVisible();
  // 19/10/2026 là thứ Hai, 23/10/2026 là thứ Sáu: bấm ngày đầu, rồi ngày cuối
  await dialog.getByRole('button', { name: '19/10/2026' }).click();
  await dialog.getByRole('button', { name: '23/10/2026' }).click();
  await expect(page).toHaveURL(/w=2026-10-19/);
  await expect(page).toHaveURL(/to=2026-10-23/);
  await expect(page).toHaveURL(/cls=1/);
  await expect(page.getByText('Từ 19/10/2026 đến 23/10/2026 (5 ngày)')).toBeVisible();
  await expect(page.getByRole('button', { name: /19–23\/10/ })).toBeVisible();

  // Mở lại: các ngày trong khoảng được đánh dấu, dòng dưới ghi khoảng đang xem
  await page.getByRole('button', { name: /19–23\/10/ }).click();
  const again = page.getByRole('dialog', { name: 'Chọn khoảng ngày' });
  await expect(again.getByRole('button', { name: '20/10/2026' })).toHaveAttribute('aria-pressed', 'true');
  await expect(again.getByText('Đang xem 19/10/2026 – 23/10/2026 · 5 ngày')).toBeVisible();
});

test('lịch học: chọn nhiều lớp thì URL giữ cả hai lớp và ô hiện đủ tên hai lớp', async ({ page }) => {
  await login(page);
  await page.goto('/lich-hoc?w=2026-10-12', { waitUntil: 'load' });
  const filter = page.getByRole('button', { name: 'Lọc theo lớp' });
  await filter.click();
  await page.getByRole('option', { name: 'GT-A1' }).click();
  await page.getByRole('option', { name: 'KIDS-M1' }).click();
  await expect(page).toHaveURL(/cls=\d+(%2C|,)\d+/);
  await expect(filter).toContainText('GT-A1');
  await expect(filter).toContainText('KIDS-M1');
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`lịch học: bảng chọn khoảng ngày nằm trong màn hình ở ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await page.goto('/lich-hoc?w=2026-10-12', { waitUntil: 'load' });
    await page.getByRole('button', { name: /Chọn khoảng ngày/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Chọn khoảng ngày' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    if (!box) throw new Error('Không đo được bảng chọn khoảng ngày');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  });
}
