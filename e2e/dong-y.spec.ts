import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Đồng ý của phụ huynh (P35.12): nhân viên ghi nhận và rút lại trong hồ sơ; phụ huynh bấm nút trên bot;
// học sinh chưa được đồng ý thì không thấy micro, trẻ từ 7 tuổi được hỏi thêm.
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

async function db() {
  loadEnvLocal();
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  return c;
}

const ROW = 'Ghi âm để giáo viên chấm bài nói';

async function consentRow(page: Page) {
  return page.getByRole('region', { name: 'Đồng ý của phụ huynh' }).getByRole('listitem', { name: ROW });
}

// Menu ⋯ đóng khi trang cuộn, nên đưa dòng vào giữa màn hình trước khi mở menu
async function openMenu(page: Page, item: string) {
  await (await consentRow(page)).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: `Thao tác: ${ROW}` }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

test('nhân viên ghi nhận đồng ý, rút lại; phụ huynh bấm Đồng ý trên bot', async ({ page }) => {
  const c = await db();
  const stamp = String(Date.now()).slice(-6);
  const chatId = 9_100_000_000 + Number(stamp);
  const [student] = (await c.query<{ id: number }>(`select s.id from students s join classes c on c.id = s.class_id where s.status = 'active' and c.campus_id = (select id from campuses where name = 'Cơ sở test') and not exists (select 1 from student_parents sp join telegram_chats tc on tc.parent_id = sp.parent_id where sp.student_id = s.id) order by s.id desc limit 1`)).rows;
  const parentId = (await c.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH E2E đồng ý ${stamp}`, `08${stamp}66`])).rows[0].id;
  await c.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', false)`, [student.id, parentId]);
  await c.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'PH E2E')`, [chatId, parentId]);
  await c.query('delete from parent_consents where student_id = $1', [student.id]);
  try {
    await login(page);
    await page.goto(`/hoc-sinh/${student.id}`);
    let row = await consentRow(page);
    await expect(row.getByText('Chưa hỏi', { exact: true })).toBeVisible();

    // Ghi nhận bằng giấy: bằng chứng bắt buộc
    await openMenu(page, 'Ghi nhận đồng ý');
    const dialog = page.getByRole('dialog', { name: 'Ghi nhận ý kiến phụ huynh' });
    await dialog.getByRole('button', { name: 'Phụ huynh đồng ý' }).click();
    await page.getByRole('option', { name: `PH E2E đồng ý ${stamp}` }).click();
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await expectToast(page, /Ghi rõ cách phụ huynh đồng ý/);
    await dialog.getByLabel('Bằng chứng đồng ý').fill('Đã ký giấy đồng ý ngày 22/10');
    await dialog.getByRole('button', { name: 'Lưu' }).click();
    await expectToast(page, 'Đã ghi nhận phụ huynh đồng ý');
    row = await consentRow(page);
    await expect(row.getByText('Đã đồng ý')).toBeVisible();
    await expect(row.getByText(/Đã ký giấy đồng ý ngày 22\/10/)).toBeVisible();

    // Rút lại qua hộp xác nhận
    await openMenu(page, 'Rút lại đồng ý');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Rút lại' }).click();
    await expectToast(page, /Đã rút lại đồng ý/);
    await expect((await consentRow(page)).getByText('Đã rút lại')).toBeVisible();

    // Gửi yêu cầu qua bot: tin có nội dung xin phép được ghi lại
    await openMenu(page, 'Gửi yêu cầu qua Telegram');
    await expect
      .poll(async () => (await c.query(`select 1 from telegram_messages where chat_id = $1 and kind = 'consent' and text like '%Xin phép%'`, [chatId])).rowCount)
      .toBe(1);

    // Phụ huynh bấm Đồng ý: Telegram gửi callback_query vào webhook
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
    const res = await page.request.post('/api/telegram/webhook', {
      headers: { 'x-telegram-bot-api-secret-token': secret },
      data: { update_id: Date.now(), callback_query: { id: `cb${stamp}`, from: { id: chatId, first_name: 'PH' }, message: { chat: { id: chatId } }, data: `consent:v:y:${student.id}` } },
    });
    expect(res.status()).toBe(200);
    // Chờ webhook ghi xong (khi chạy song song máy bận, ghi DB có thể chậm hơn lúc trả 200)
    await expect
      .poll(async () => (await c.query<{ granted: boolean; channel: string; parent_id: number }>(`select granted, channel, parent_id from parent_consents where student_id = $1 order by id desc limit 1`, [student.id])).rows)
      .toEqual([{ granted: true, channel: 'telegram', parent_id: parentId }]);

    // Phụ huynh của học sinh khác bấm nút cho học sinh này thì không ghi
    const before = (await c.query('select count(*)::int n from parent_consents where student_id = $1', [student.id])).rows[0].n;
    await c.query('delete from student_parents where parent_id = $1', [parentId]);
    await page.request.post('/api/telegram/webhook', {
      headers: { 'x-telegram-bot-api-secret-token': secret },
      data: { update_id: Date.now() + 1, callback_query: { id: `cc${stamp}`, from: { id: chatId }, message: { chat: { id: chatId } }, data: `consent:v:n:${student.id}` } },
    });
    expect((await c.query('select count(*)::int n from parent_consents where student_id = $1', [student.id])).rows[0].n).toBe(before);

    await page.reload();
    await expect((await consentRow(page)).getByText('Đã đồng ý')).toBeVisible();
    await expect((await consentRow(page)).getByText(/qua Telegram/)).toBeVisible();
  } finally {
    await c.query('delete from parent_consents where student_id = $1', [student.id]);
    await c.query('delete from telegram_messages where chat_id = $1', [chatId]);
    await c.query('delete from telegram_chats where chat_id = $1', [chatId]);
    await c.query('delete from parents where id = $1', [parentId]);
    await c.end();
  }
});

test('học sinh chưa được đồng ý không thấy micro; trẻ từ 7 tuổi bấm Con đồng ý thì ghi âm được', async ({ page }) => {
  const c = await db();
  try {
    await page.goto('/hoc-thu');
    await page.waitForURL(/\/cua-toi\/\d+$/);
    const url = page.url();
    const [{ student_id: studentId }] = (await c.query<{ student_id: number }>(`select student_id from accounts where email = 'hoc-thu@demo.esl-center.vn'`)).rows;

    // Rút lại đồng ý: câu nói hiện lời nhắn, không có micro
    await c.query(`update parent_consents set withdrawn_at = now() where student_id = $1 and withdrawn_at is null`, [studentId]);
    await page.goto(url);
    while (!(await page.getByText('Listen and repeat.').isVisible())) await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await expect(page.getByText(/bố mẹ con chưa đồng ý cho con ghi âm/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bấm để nói' })).toHaveCount(0);

    // Phụ huynh đồng ý nhưng trẻ (học thử sinh năm 2018) chưa đồng ý: hỏi trẻ
    await c.query(
      `insert into parent_consents (student_id, purpose, granted, channel, terms_version, note) values ($1, 'voice_teacher_review', true, 'staff', '2026-10-22', 'E2E')`,
      [studentId],
    );
    await page.goto(url);
    while (!(await page.getByText('Listen and repeat.').isVisible())) await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByRole('button', { name: 'Con đồng ý' }).click();
    await expect(page.getByRole('button', { name: 'Bấm để nói' })).toBeVisible();
    const [{ agreed }] = (await c.query<{ agreed: boolean }>(`select child_agreed_at is not null as agreed from parent_consents where student_id = $1 order by id desc limit 1`, [studentId])).rows;
    expect(agreed).toBe(true);
  } finally {
    await c.end();
  }
});
