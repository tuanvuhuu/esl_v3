import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { dialogById, expectToast, login } from './helpers';

// Kéo thả (35.x, Lịch học và form lớp). Lớp thử ở Cơ sở test, học T2 và T4 lúc 09:00–10:00.
// A. Lịch học: kéo buổi 1 từ thứ Hai sang thứ Năm. Hộp xác nhận hiện ra; bấm Huỷ thì buổi giữ nguyên ngày;
//    kéo lại và xác nhận thì buổi chuyển sang thứ Năm và có thông báo.
// B. Form tạo lớp: thêm ca thứ Hai thứ hai, kéo ca đó lên trước ca đầu (đổi thứ tự trong ngày), rồi kéo sang thứ Tư.

const run = String(Date.now()).slice(-6);
const CLS = `KT-${run}`;

// Thứ Hai của tuần sau (giờ Việt Nam), dạng YYYY-MM-DD
function nextMonday(): Date {
  const now = new Date(Date.now() + 7 * 3_600_000);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const add = ((8 - d.getUTCDay()) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d;
}
const key = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

// Kéo một phần tử tới điểm đích (qua nhiều bước để dnd-kit nhận cử chỉ)
async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  // dnd-kit chặn click trong 50ms sau khi thả (xem detach trong @dnd-kit/core), chờ qua khoảng đó để bấm nút sau khi kéo
  await page.waitForTimeout(150);
}

// Tâm của phần tử nguồn, sau khi cuộn tới giữa khung cuộn (thanh tiêu đề dính không che phần tử)
async function center(locator: ReturnType<Page['locator']>) {
  const el = locator.first();
  await el.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  return boxCenter(locator);
}

// Tâm của phần tử đích, không cuộn: cuộn lại sẽ làm lệch điểm xuất phát đã đọc trước đó
async function boxCenter(locator: ReturnType<Page['locator']>) {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error('không thấy phần tử để kéo');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('kéo thả: dời buổi học có hộp xác nhận (Huỷ thì không đổi); kéo ca học trong form lớp đổi thứ tự và sang ngày khác', async ({ page }) => {
  test.setTimeout(180_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^KT-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from class_sessions where class_id in (${stale})`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E kéo thả', $3, 'T2,T4 · 09:00–10:00', 'T2,T4', '09:00', '10:00', 2, 1000000, 'KT-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const mon = nextMonday();
    const thu = addDays(mon, 3);
    const startsAt = new Date(`${key(mon)}T09:00:00+07:00`);
    await db.query(
      `insert into class_sessions (class_id, session_no, starts_at, ends_at, teacher_id, room, status) values ($1, 1, $2, $3, $4, 'KT-P', 'planned')`,
      [cls.id, startsAt, new Date(startsAt.getTime() + 3_600_000), teacher.id],
    );

    await login(page);

    // A. Lịch học: chỉ tuần đó, chỉ lớp thử. Chỉ lấy buổi trên lưới tuần (ô có [data-day]), không lấy thẻ điện thoại.
    await page.goto(`/lich-hoc?w=${key(mon)}&to=${key(addDays(mon, 6))}&cls=${cls.id}`);
    const sessionCard = () => page.locator('[data-day] [data-card]', { hasText: CLS }).first();
    await expect(sessionCard()).toBeVisible({ timeout: 30_000 });

    // Kéo sang thứ Năm, giữ nguyên độ cao để giờ không đổi (chỉ đổi ngày)
    const dropOnThursday = async () => {
      const from = await center(sessionCard());
      const col = await page.locator(`[data-day="${key(thu)}"]`).boundingBox();
      if (!col) throw new Error('không thấy cột thứ Năm');
      await dragTo(page, from, { x: col.x + col.width / 2, y: from.y });
    };

    await dropOnThursday();
    const confirm = page.getByRole('alertdialog', { name: /Dời buổi học/ });
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText(CLS);
    // Huỷ: buổi giữ nguyên
    await confirm.getByRole('button', { name: 'Huỷ', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    const [still] = (await db.query<{ starts_at: Date }>(`select starts_at from class_sessions where class_id = $1`, [cls.id])).rows;
    expect(still.starts_at.getTime()).toBe(startsAt.getTime());

    // Kéo lại và xác nhận: buổi sang thứ Năm, giữ giờ 09:00
    await dropOnThursday();
    const confirmAgain = page.getByRole('alertdialog', { name: /Dời buổi học/ });
    await expect(confirmAgain, 'kéo lại buổi học phải mở hộp xác nhận').toBeVisible({ timeout: 10_000 });
    await confirmAgain.getByRole('button', { name: 'Dời buổi', exact: true }).click();
    await expectToast(page, /Đã dời buổi/);
    const [moved] = (await db.query<{ starts_at: Date }>(`select starts_at from class_sessions where class_id = $1`, [cls.id])).rows;
    expect(new Date(moved.starts_at).toISOString().slice(0, 10)).toBe(key(thu));
    expect(new Date(moved.starts_at).getTime()).toBe(new Date(`${key(thu)}T09:00:00+07:00`).getTime());

    // B. Form tạo lớp: hai ca thứ Hai, kéo ca 2 lên trước ca 1, rồi kéo sang thứ Tư
    await page.goto('/lop-hoc');
    await page.getByRole('button', { name: 'Tạo lớp học' }).first().click();
    const create = dialogById(page, 'class-create-title');
    await create.locator('label:has(input[value="T2"])').click();
    await create.getByLabel('Giờ bắt đầu Thứ 2', { exact: true }).fill('08:00');
    await create.getByLabel('Giờ kết thúc Thứ 2', { exact: true }).fill('09:00');
    await create.getByRole('button', { name: 'Thêm ca Thứ 2', exact: true }).click();
    await expect(create.getByLabel('Giờ bắt đầu Thứ 2 ca 2')).toBeVisible();
    await create.locator('label:has(input[value="T4"])').click();

    const handle2 = create.getByRole('button', { name: 'Kéo ca Thứ 2 ca 2 để đổi chỗ' });
    const row1 = create.locator('[data-slot="T2-1"]');
    await dragTo(page, await center(handle2), await boxCenter(row1));
    // Ca 2 mặc định là 09:30–10:30 (cách ca 1 30 phút). Sau khi kéo lên trước: ca 1 là 09:30, ca 2 là 08:00
    await expect(create.getByLabel('Giờ bắt đầu Thứ 2 ca 1', { exact: true })).toHaveValue('09:30');
    await expect(create.getByLabel('Giờ bắt đầu Thứ 2 ca 2', { exact: true })).toHaveValue('08:00');

    // Kéo ca 2 (08:00) sang thứ Tư: thứ Hai còn một ca 09:30, thứ Tư có hai ca và ca mới là 08:00
    await dragTo(page, await center(create.getByRole('button', { name: 'Kéo ca Thứ 2 ca 2 để đổi chỗ' })), await boxCenter(create.locator('[data-day="T4"]')));
    await expect(create.getByLabel('Giờ bắt đầu Thứ 2', { exact: true })).toHaveValue('09:30');
    await expect(create.getByLabel('Giờ bắt đầu Thứ 4 ca 2', { exact: true })).toHaveValue('08:00');
  } finally {
    await db.query(`delete from class_sessions where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query(`delete from classes where name = $1`, [CLS]);
    await db.end();
  }
});
