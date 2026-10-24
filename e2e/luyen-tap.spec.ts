import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';
import { hashPassword } from '../src/lib/auth/password';

// Màn làm bài theo chế độ (35.5). Lớp thử ở Cơ sở test. Giáo vụ đổi bài sang "Luyện tập" ở màn Bài tập. Học sinh ở 390px:
// mỗi câu tự chấm bấm Kiểm tra; sai thì báo và làm lại (đổi đáp án), đúng thì mới sang câu; câu sắp xếp đổi chỗ từ bằng kéo
// (bàn phím của dnd-kit). Nộp xong đủ điểm. Ở 1024px: bài kiểm tra vẫn làm một lượt (không có nút Kiểm tra), có nút
// Nghe hướng dẫn, không tràn ngang.
const run = String(Date.now()).slice(-6);
const CLS = `LT-${run}`;
const EMAIL = `luyen-tap-${run}@hoc-sinh.local`;
const PASSWORD = `LuyenTap-${run}-x`;

async function studentLogin(page: Page) {
  await page.goto('/dang-nhap');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('**/cua-toi**');
}

test('luyện tập: kiểm từng câu, sai làm lại, kéo đổi chỗ từ; kiểm tra: làm một lượt; 390px và 1024px', async ({ page, browser }) => {
  test.setTimeout(180_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^LT-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from accounts where student_id in (select id from students where class_id in (${stale}))`);
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E luyện tập', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 1000000, 'LT-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [kid] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [`Bé luyện tập ${run}`, `be luyen tap ${run}`, cls.id])).rows;
    await db.query(`insert into accounts (full_name, email, role, status, password_hash, student_id) values ($1, $2, 'student', 'active', $3, $4)`, [`Bé luyện tập ${run}`, EMAIL, await hashPassword(PASSWORD), kid.id]);
    const mk = async (title: string) => (await db.query<{ id: number }>(`insert into assignments (class_id, title, due_at, max_score) values ($1, $2, now() + interval '3 days', 6) returning id`, [cls.id, title])).rows[0].id;
    const practice = await mk(`Luyện ${run}`);
    const quiz = await mk(`Kiểm tra ${run}`);
    for (const asg of [practice, quiz]) {
      const [c] = (await db.query<{ id: number }>(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, points) values ($1, 1, 'reading', 'choice', 'Which one is a fruit?', 'Cái nào là trái cây?', 2) returning id`, [asg])).rows;
      await db.query(`insert into assignment_item_options (item_id, position, label, is_correct) values ($1, 1, 'apple', true), ($1, 2, 'chair', false), ($1, 3, 'pencil', false)`, [c.id]);
      await db.query(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points, reference_text) values ($1, 2, 'writing', 'order', 'Put the words in order.', 2, 'I like red apples')`, [asg]);
      await db.query(`insert into assignment_items (assignment_id, position, skill, item_type, prompt, points, reference_text, passage) values ($1, 3, 'writing', 'gap_fill', 'Fill in the blank.', 2, 'have', 'I ___ a cat.')`, [asg]);
    }

    // Giáo vụ đổi bài sang chế độ luyện tập
    await login(page);
    await page.goto(`/bai-tap?cls=${cls.id}`);
    await page.getByRole('button', { name: `Thao tác với bài Luyện ${run}` }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    const form = page.getByRole('dialog', { name: 'Sửa bài tập' });
    await form.getByRole('button', { name: 'Chế độ làm bài' }).click();
    await page.getByRole('option', { name: /Luyện tập/ }).click();
    await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expectToast(page, /Đã lưu/);
    expect((await db.query<{ mode: string }>('select mode from assignments where id = $1', [practice])).rows[0].mode).toBe('practice');

    // Học sinh ở 390px làm bài luyện tập
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await studentLogin(phone);
    await phone.goto(`/cua-toi/${practice}`);
    await expect(phone.getByText('Luyện tập', { exact: true })).toBeVisible();
    const check = phone.getByRole('button', { name: 'Kiểm tra', exact: true });
    for (let q = 0; q < 3; q++) {
      const prompt = (await phone.getByRole('heading', { level: 2 }).first().textContent())?.trim();
      if (prompt === 'Which one is a fruit?') {
        await expect(check).toBeDisabled(); // chưa chọn thì chưa kiểm được
        await phone.getByRole('button', { name: /chair$/ }).click();
        await check.click();
        await expect(phone.getByText('Chưa đúng, con thử lại nhé!')).toBeVisible();
        await phone.getByRole('button', { name: /apple$/ }).click();
      } else if (prompt === 'Put the words in order.') {
        // Xếp sai hai từ cuối, kiểm sai; rồi kéo "apples" lên trước "red" bằng bàn phím của dnd-kit
        for (const w of ['I', 'like', 'apples', 'red']) await phone.getByRole('button', { name: w, exact: true }).locator('visible=true').last().click();
        await check.click();
        await expect(phone.getByText('Chưa đúng, con thử lại nhé!')).toBeVisible();
        const apples = phone.locator('[data-placed="apples"]');
        await apples.focus();
        await phone.keyboard.press('Space');
        await phone.waitForTimeout(200);
        await phone.keyboard.press('ArrowRight');
        await phone.waitForTimeout(300);
        await phone.keyboard.press('Space');
        await expect(phone.locator('[data-placed]')).toHaveText(['I', 'like', 'red', 'apples']);
      } else {
        await phone.getByPlaceholder('Gõ từ của bạn…').fill('has');
        await check.click();
        await expect(phone.getByText('Chưa đúng, con thử lại nhé!')).toBeVisible();
        await phone.getByPlaceholder('Gõ từ của bạn…').fill('have');
      }
      // Đổi đáp án thì báo sai biến mất, kiểm lại được; đúng thì mới có nút sang câu
      await expect(phone.getByText('Chưa đúng, con thử lại nhé!')).toHaveCount(0);
      await check.click();
      await expect(phone.getByText('Đúng rồi! Giỏi quá 🎉')).toBeVisible();
      expect(await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      await phone.getByRole('button', { name: q < 2 ? /Tiếp tục/ : /Xong bài/ }).click();
    }
    await expect(phone.getByText('Đúng 6/6 điểm phần tự chấm')).toBeVisible({ timeout: 30_000 });
    await phone.context().close();

    // 1024px: bài kiểm tra làm một lượt, không có nút Kiểm tra; có nút Nghe hướng dẫn
    const tablet = await (await browser.newContext({ viewport: { width: 1024, height: 768 } })).newPage();
    await studentLogin(tablet);
    await tablet.goto(`/cua-toi/${quiz}`);
    await expect(tablet.getByText(/^1\/3$/)).toBeVisible();
    await expect(tablet.getByRole('button', { name: 'Kiểm tra', exact: true })).toHaveCount(0);
    await expect(tablet.getByText('Luyện tập', { exact: true })).toHaveCount(0);
    await tablet.getByRole('button', { name: 'Nghe hướng dẫn' }).click();
    await expect(tablet.getByRole('button', { name: /Tiếp tục/ })).toBeEnabled();
    expect(await tablet.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await tablet.context().close();

    // Máy chủ chỉ kiểm câu cho bài luyện tập
    const res = await db.query<{ mode: string }>('select mode from assignments where id = $1', [quiz]);
    expect(res.rows[0].mode).toBe('test');
  } finally {
    await db.query('delete from accounts where email = $1', [EMAIL]);
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.end();
  }
});
