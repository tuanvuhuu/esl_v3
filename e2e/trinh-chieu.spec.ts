import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { ADMIN, devPassword, loadEnvLocal } from './env';
import { login } from './helpers';

// Trình chiếu (35.19): lớp thử ở Cơ sở test có danh sách 3 từ và một bài có câu trắc nghiệm.
// Mở trình chiếu từ menu ⋯ của danh sách; bàn phím chuyển trang (Tiếp hiện đáp án trước); điện thoại điều khiển
// (mở trang điều khiển cùng tài khoản) thì máy chiếu đổi theo và ngược lại; đổi kiểu Đố cả lớp; chiếu câu hỏi của bài.
// Điện thoại chưa đăng nhập quét mã thì đăng nhập xong về đúng trang điều khiển.
const run = String(Date.now()).slice(-6);
const CLS = `TC2-${run}`;
const LIST = `Chiếu ${run}`;
const ASG = `Bài chiếu ${run}`;

test('trình chiếu: bàn phím và điện thoại chuyển trang, đồng bộ hai bên; đố cả lớp; chiếu câu hỏi của bài', async ({ page, browser }) => {
  test.setTimeout(150_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^TC2-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from word_lists where class_id in (${stale})`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E trình chiếu', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'TC2-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    await db.query(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'active', '2026-09-01')`, [`Bé chiếu ${run}`, `be chieu ${run}`, cls.id]);
    const [list] = (await db.query<{ id: number }>(`insert into word_lists (name, class_id) values ($1, $2) returning id`, [LIST, cls.id])).rows;
    for (const [k, [word, meaning, emoji]] of [['cat', 'con mèo', '🐱'], ['dog', 'con chó', '🐶'], ['bird', 'con chim', '🐦']].entries()) {
      await db.query(`insert into word_list_items (list_id, position, word, meaning_vi, emoji) values ($1, $2, $3, $4, $5)`, [list.id, k + 1, word, meaning, emoji]);
    }
    const [asg] = (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + interval '3 days', 10) returning id`, [cls.id, ASG])).rows;
    const [item] = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points) values ($1, 1, 'reading', 'choice', 'Which one is a fruit?', 10) returning id`, [asg.id])).rows;
    await db.query(`insert into assignment_item_options (item_id, position, label, is_correct) values ($1, 1, 'chair', false), ($1, 2, 'apple', true), ($1, 3, 'pencil', false)`, [item.id]);

    await login(page);
    await page.goto('/tu-vung');
    await page.getByRole('button', { name: `Thao tác với ${LIST}`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Trình chiếu' }).click();
    await page.waitForURL(/\/trinh-chieu\/[\w-]+$/);
    const token = page.url().split('/').pop()!;
    const stage = page.locator('[data-slide]');

    // Thẻ từ: Tiếp lần đầu hiện đáp án, lần sau sang trang
    await expect(page.getByLabel('Số trang')).toHaveText('1 / 3');
    await expect(page.getByRole('heading', { name: 'What is it?' })).toBeVisible();
    await expect(stage).toHaveAttribute('data-revealed', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-revealed', 'true');
    const firstWord = await page.getByLabel('Đáp án', { exact: true }).locator('p').first().textContent();
    expect(['cat', 'dog', 'bird']).toContain(firstWord);
    await page.keyboard.press('PageDown');
    await expect(page.getByLabel('Số trang')).toHaveText('2 / 3');
    await expect(stage).toHaveAttribute('data-revealed', 'false');

    // Điện thoại (cùng tài khoản) điều khiển: máy chiếu đổi theo
    const remote = await page.context().newPage();
    await remote.setViewportSize({ width: 390, height: 844 });
    await remote.goto(`/trinh-chieu/${token}/dieu-khien`);
    const status = remote.getByLabel('Trang đang chiếu');
    await expect(status).toContainText('Trang 2/3');
    await expect(remote.getByText(/^Đáp án:/)).toBeVisible();
    await remote.getByRole('button', { name: 'Tiếp' }).click();
    await expect(status).toContainText('đang hiện đáp án');
    await remote.getByRole('button', { name: 'Tiếp' }).click();
    await expect(status).toContainText('Trang 3/3');
    await expect(page.getByLabel('Số trang')).toHaveText('3 / 3');
    expect(await remote.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

    // Máy chiếu lùi trang: điện thoại đổi theo
    await page.bringToFront();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByLabel('Số trang')).toHaveText('2 / 3');
    await expect(status).toContainText('Trang 2/3');

    // Đố cả lớp: về trang đầu, 3 từ để chọn; hiện đáp án tô đúng một từ
    await page.getByRole('group', { name: 'Kiểu chiếu' }).getByRole('button', { name: 'Đố cả lớp' }).click();
    await expect(page.getByRole('heading', { name: 'Which word is it?' })).toBeVisible();
    await expect(page.getByLabel('Số trang')).toHaveText('1 / 3');
    const options = page.getByRole('list', { name: 'Các đáp án' }).getByRole('listitem');
    await expect(options).toHaveCount(3);
    await page.getByRole('button', { name: 'Hiện đáp án' }).click();
    await expect(page.locator('[data-correct="true"]')).toHaveCount(1);
    await expect(remote.getByLabel('Trang đang chiếu')).toContainText('Trang 1/3 · đang hiện đáp án');
    await remote.close();

    // Chiếu câu hỏi của bài từ màn chấm bài
    await page.goto(`/bai-tap/${asg.id}`);
    await page.getByRole('button', { name: 'Trình chiếu' }).click();
    await page.waitForURL(/\/trinh-chieu\/[\w-]+$/);
    await expect(page.getByRole('heading', { name: 'Which one is a fruit?' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Kiểu chiếu' })).toHaveCount(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-correct="true"]')).toHaveText('apple');
    const asgToken = page.url().split('/').pop()!;

    // Điện thoại chưa đăng nhập quét mã: đăng nhập xong về đúng trang điều khiển
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await phone.goto(`/trinh-chieu/${asgToken}/dieu-khien`);
    await phone.waitForURL(/\/dang-nhap\?next=/);
    await phone.getByLabel('Email').fill(ADMIN);
    await phone.getByLabel('Mật khẩu').fill(devPassword());
    await phone.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await phone.waitForURL(`**/trinh-chieu/${asgToken}/dieu-khien`);
    await expect(phone.getByText('Đáp án:')).toContainText('apple');
    await phone.context().close();

    // Đường dẫn ngoài trong ?next= không được dùng
    const other = await (await browser.newContext()).newPage();
    await other.goto('/dang-nhap?next=//evil.example');
    await other.getByLabel('Email').fill(ADMIN);
    await other.getByLabel('Mật khẩu').fill(devPassword());
    await other.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await other.waitForURL('**/tong-quan');
    await other.context().close();
  } finally {
    await db.query(`delete from present_sessions where source_kind = 'word_list' and source_id in (select id from word_lists where name = $1)`, [LIST]);
    await db.query(`delete from present_sessions where source_kind = 'assignment' and source_id in (select a.id from assignments a join classes c on c.id = a.class_id where c.name = $1)`, [CLS]);
    await db.query(`delete from word_lists where name = $1`, [LIST]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.end();
  }
});
