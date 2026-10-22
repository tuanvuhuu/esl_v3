// Kịch bản bot Telegram P37 (docs/KICH-BAN-TELEGRAM.md). Gửi update giả vào webhook rồi kiểm dữ liệu trong DB.
// Chưa đặt TELEGRAM_BOT_TOKEN nên bot không gọi mạng; tin gửi ra vẫn được lưu trong telegram_messages để kiểm.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { dialogById, expectToast, login, uniq } from './helpers';

type Ctx = { db: Client; secret: string; stamp: string };

function setup(): Ctx {
  loadEnvLocal();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
  expect(secret.length).toBeGreaterThanOrEqual(16);
  return { db: new Client({ connectionString: process.env.DATABASE_URL }), secret, stamp: String(Date.now()).slice(-6) };
}

function bot(request: APIRequestContext, secret: string) {
  const post = (data: unknown) => request.post('/api/telegram/webhook', { headers: { 'x-telegram-bot-api-secret-token': secret }, data });
  return {
    text: (chatId: number, text: string) =>
      post({ update_id: Date.now(), message: { message_id: 1, chat: { id: chatId, type: 'private' }, from: { id: chatId, first_name: 'E2E', is_bot: false }, text } }),
    contact: (chatId: number, phone: string, userId: number) =>
      post({ update_id: Date.now(), message: { message_id: 1, chat: { id: chatId, type: 'private' }, from: { id: chatId, first_name: 'E2E', is_bot: false }, contact: { phone_number: phone, user_id: userId } } }),
    tap: (chatId: number, data: string) =>
      post({ update_id: Date.now(), callback_query: { id: `cb${Date.now()}${Math.random()}`, from: { id: chatId }, message: { message_id: 7, chat: { id: chatId } }, data } }),
  };
}

const outTexts = async (db: Client, chatId: number, kind?: string) =>
  (
    await db.query<{ text: string; kind: string }>(
      `select text, kind from telegram_messages where chat_id = $1 and direction = 'out' ${kind ? 'and kind = $2' : ''} order by id`,
      kind ? [chatId, kind] : [chatId],
    )
  ).rows;

test.describe('bot Telegram: kịch bản P37', () => {
  test('kết nối: gõ số tay hay gửi danh bạ người khác thì không kết nối; danh bạ của chính mình thì kết nối', async ({ request }) => {
    const { db, secret, stamp } = setup();
    await db.connect();
    const b = bot(request, secret);
    const chatId = 9_200_000_000 + Number(stamp);
    const phone = `09${stamp}77`;
    let parentId = 0;
    try {
      parentId = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH E2E danh bạ ${stamp}`, phone])).rows[0].id;
      const linked = async () => (await db.query(`select parent_id from telegram_chats where chat_id = $1 and active`, [chatId])).rows;

      // Người lạ gõ đúng số của phụ huynh: không kết nối (trước đây kết nối được, lộ thông tin của trẻ)
      expect((await b.text(chatId, phone)).status()).toBe(200);
      expect(await linked()).toEqual([]);
      // Danh bạ chuyển tiếp của người khác (user_id khác người gửi): không kết nối
      await b.contact(chatId, `+84${phone.slice(1)}`, chatId + 1);
      expect(await linked()).toEqual([]);
      // Danh bạ của chính người gửi, số dạng +84: kết nối đúng phụ huynh
      await b.contact(chatId, `+84${phone.slice(1)}`, chatId);
      expect(await linked()).toEqual([{ parent_id: parentId }]);
      expect((await outTexts(db, chatId)).some((m) => m.text.includes('kết nối thành công'))).toBe(true);
    } finally {
      await db.query(`delete from telegram_messages where chat_id = $1`, [chatId]);
      await db.query(`delete from telegram_chats where chat_id = $1`, [chatId]);
      if (parentId) await db.query(`delete from parents where id = $1`, [parentId]);
      await db.end();
    }
  });

  test('xin nghỉ: chọn buổi, gõ lý do, giáo viên đủ quyền duyệt một lần; phụ huynh khác không đụng được; huỷ và xin lại', async ({ request }) => {
    const { db, secret, stamp } = setup();
    await db.connect();
    const b = bot(request, secret);
    const parentChat = 9_300_000_000 + Number(stamp) * 10;
    const otherParentChat = parentChat + 1;
    const teacherChat = parentChat + 2;
    const accountantChat = parentChat + 3;
    const parentIds: number[] = [];
    const accountIds: number[] = [];
    let studentId = 0;
    const touchedDates: string[] = [];
    try {
      // Học sinh có hai buổi sắp tới chưa có đơn và chưa điểm danh ngày đó
      const [kid] = (
        await db.query<{ student_id: number; campus_id: number; teacher_id: number }>(`
          select s.id as student_id, c.campus_id, c.teacher_id from students s join classes c on c.id = s.class_id
          where s.status = 'active'
            -- Chỉ dữ liệu thử ở Cơ sở test, không đụng học sinh thật của các cơ sở khác
            and c.campus_id = (select id from campuses where name = 'Cơ sở test')
            -- Không chọn học sinh có phụ huynh đang kết nối thật (dev server có bot token thật, tin sẽ tới điện thoại thật)
            and not exists (select 1 from student_parents sp join telegram_chats tc on tc.parent_id = sp.parent_id where sp.student_id = s.id)
            and (select count(*) from class_sessions cs where cs.class_id = c.id and cs.status = 'planned' and cs.starts_at > now() + interval '1 hour') >= 2
          order by s.id limit 1`)
      ).rows;
      expect(kid).toBeTruthy();
      studentId = kid.student_id;
      await db.query(`delete from leave_requests where student_id = $1`, [studentId]);
      const sessions = (
        await db.query<{ id: number; day: string }>(`
          select cs.id, to_char(cs.starts_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as day
          from class_sessions cs join students s on s.class_id = cs.class_id
          where s.id = $1 and cs.status = 'planned' and cs.starts_at > now() + interval '1 hour'
            and not exists (select 1 from attendance a where a.student_id = s.id and a.session_date = (cs.starts_at at time zone 'Asia/Ho_Chi_Minh')::date)
          order by cs.starts_at limit 2`,
          [studentId],
        )
      ).rows;
      expect(sessions).toHaveLength(2);
      const [first, second] = sessions;

      // Phụ huynh của học sinh và một phụ huynh khác, đều đã kết nối
      for (const [i, chatId] of [parentChat, otherParentChat].entries()) {
        const id = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH E2E nghỉ ${stamp}-${i}`, `08${stamp}${i}5`])).rows[0].id;
        parentIds.push(id);
        await db.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'E2E')`, [chatId, id]);
      }
      await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', false)`, [studentId, parentIds[0]]);
      // Giáo viên chủ nhiệm của lớp (có quyền điểm danh, đúng cơ sở) và kế toán (không có quyền)
      for (const [role, chatId, teacherId] of [
        ['teacher', teacherChat, kid.teacher_id],
        ['accountant', accountantChat, null],
      ] as const) {
        const id = (
          await db.query<{ id: number }>(`insert into accounts (full_name, email, role, status, teacher_id) values ($1, $2, $3, 'active', $4) returning id`, [
            `E2E ${role} ${stamp}`,
            `e2e.tele.${role}.${stamp}@esl-center.vn`,
            role,
            teacherId,
          ])
        ).rows[0].id;
        accountIds.push(id);
        await db.query(`insert into account_campuses (account_id, campus_id) values ($1, $2)`, [id, kid.campus_id]);
        await db.query(`insert into telegram_chats (chat_id, account_id, display_name) values ($1, $2, 'E2E')`, [chatId, id]);
      }
      const leave = async (sessionId: number) =>
        (await db.query<{ id: number; status: string; reason: string; decided_by_account_id: number | null }>(`select id, status, reason, decided_by_account_id from leave_requests where student_id = $1 and session_id = $2`, [studentId, sessionId])).rows[0];

      // Phụ huynh khác bấm nút xin nghỉ đã sửa tay: không tạo được đơn
      await b.tap(otherParentChat, `leave_sess:${studentId}:${first.id}`);
      expect(await leave(first.id)).toBeUndefined();

      // /nghi liệt kê buổi; chọn buổi thì có đơn nháp; gõ lý do thì đơn chờ duyệt
      await b.text(parentChat, '/nghi');
      expect((await outTexts(db, parentChat)).some((m) => m.text.startsWith('Chọn buổi muốn xin nghỉ'))).toBe(true);
      await b.tap(parentChat, `leave_sess:${studentId}:${first.id}`);
      expect((await leave(first.id))?.status).toBe('draft');
      await b.text(parentChat, '  Con bị   sốt ');
      const pending = await leave(first.id);
      expect(pending).toMatchObject({ status: 'pending', reason: 'Con bị sốt' });
      expect((await outTexts(db, parentChat, 'leave')).some((m) => m.text.includes('Đã gửi đơn xin nghỉ'))).toBe(true);
      // Giáo viên của lớp nhận đơn kèm lý do; kế toán không nhận
      expect((await outTexts(db, teacherChat, 'leave')).some((m) => m.text.includes(`ĐƠN XIN NGHỈ HỌC #${pending.id}`) && m.text.includes('Con bị sốt'))).toBe(true);
      expect(await outTexts(db, accountantChat, 'leave')).toEqual([]);
      // Tin gõ lý do không bị chuyển như tin nhắn thường
      expect((await db.query(`select count(*)::int as n from telegram_messages where chat_id = $1 and kind = 'ack'`, [parentChat])).rows[0].n).toBe(0);

      // Phụ huynh khác huỷ hộ, kế toán duyệt: đơn không đổi
      await b.tap(otherParentChat, `lv_x:${pending.id}`);
      await b.tap(accountantChat, `leave_appr:${pending.id}`);
      expect((await leave(first.id))?.status).toBe('pending');

      // /donnghi của giáo viên thấy đơn này
      await b.text(teacherChat, '/donnghi');
      expect((await outTexts(db, teacherChat)).some((m) => m.text.includes(`#${pending.id}`) && m.text.includes('Con bị sốt'))).toBe(true);

      // Giáo viên duyệt: đơn đã duyệt, ghi vắng vào sổ điểm danh, phụ huynh nhận kết quả
      await b.tap(teacherChat, `leave_appr:${pending.id}`);
      touchedDates.push(first.day);
      expect(await leave(first.id)).toMatchObject({ status: 'approved', decided_by_account_id: accountIds[0] });
      const mark = (await db.query(`select mark from attendance where student_id = $1 and session_date = $2::date`, [studentId, first.day])).rows;
      expect(mark).toEqual([{ mark: 'absent' }]);
      expect((await outTexts(db, parentChat, 'leave')).some((m) => m.text.includes('đã được Thầy/Cô'))).toBe(true);

      // Bấm lại Từ chối, phụ huynh bấm Huỷ: đơn đã duyệt không đổi
      await b.tap(teacherChat, `leave_deny:${pending.id}`);
      await b.tap(parentChat, `lv_x:${pending.id}`);
      expect((await leave(first.id))?.status).toBe('approved');
      // Buổi đã có đơn duyệt không còn nút xin nghỉ
      await b.text(parentChat, '/nghi');
      const list = (await outTexts(db, parentChat)).filter((m) => m.text.startsWith('Chọn buổi muốn xin nghỉ')).at(-1);
      expect(list?.text).toContain('đơn đã duyệt');

      // Buổi thứ hai: chọn lý do bằng nút, huỷ đơn, xin lại thì mở lại đúng đơn đó
      await b.tap(parentChat, `leave_sess:${studentId}:${second.id}`);
      const draft = await leave(second.id);
      await b.tap(parentChat, `lv_r:${draft.id}:sick`);
      expect(await leave(second.id)).toMatchObject({ status: 'pending', reason: 'Ốm, sức khoẻ' });
      await b.tap(parentChat, `lv_x:${draft.id}`);
      expect((await leave(second.id))?.status).toBe('cancelled');
      expect((await outTexts(db, teacherChat, 'leave')).some((m) => m.text.includes('HUỶ đơn'))).toBe(true);
      await b.tap(parentChat, `leave_sess:${studentId}:${second.id}`);
      expect(await leave(second.id)).toMatchObject({ id: draft.id, status: 'draft', reason: '' });
    } finally {
      for (const day of touchedDates) {
        await db.query(`delete from attendance where student_id = $1 and session_date = $2::date and updated_at > now() - interval '15 minutes'`, [studentId, day]);
      }
      if (studentId) await db.query(`delete from leave_requests where student_id = $1`, [studentId]);
      const chats = [parentChat, otherParentChat, teacherChat, accountantChat];
      await db.query(`delete from telegram_messages where chat_id = any($1::bigint[])`, [chats]);
      await db.query(`delete from telegram_chats where chat_id = any($1::bigint[])`, [chats]);
      if (accountIds.length) await db.query(`delete from accounts where id = any($1::int[])`, [accountIds]);
      if (parentIds.length) await db.query(`delete from parents where id = any($1::int[])`, [parentIds]);
      await db.end();
    }
  });

  test('điểm danh vắng báo phụ huynh, sửa có mặt báo cập nhật, vắng 3 buổi liên tiếp báo giáo viên; huỷ buổi báo cả lớp', async ({ page }) => {
    const { db, secret, stamp } = setup();
    await db.connect();
    const b = bot(page.request, secret);
    const parentChat = 9_500_000_000 + Number(stamp) * 10;
    const teacherChat = parentChat + 1;
    const className = `TELE-E2E-${stamp}`;
    let classId = 0;
    let parentId = 0;
    let accountId = 0;
    try {
      // Lớp thử riêng ở cơ sở của lớp 2 (cơ sở đang xem mặc định), một học sinh, 4 buổi đã qua và 1 buổi sắp tới
      // Lần chạy trước bị quá giờ thì finally không chạy hết: dọn lớp thử còn sót (lớp sót làm hỏng các màn danh sách lớp)
      for (const old of (await db.query<{ id: number }>(`select id from classes where name like 'TELE-E2E-%'`)).rows) {
        await db.query(`delete from attendance where class_id = $1`, [old.id]);
        await db.query(`delete from students where class_id = $1`, [old.id]);
        await db.query(`delete from classes where id = $1`, [old.id]);
      }
      const [base] = (await db.query<{ campus_id: number; teacher_id: number }>(`select campus_id, teacher_id from classes where id = 2`)).rows;
      classId = (
        await db.query<{ id: number }>(
          `insert into classes (campus_id, name, course, teacher_id, sessions_total, fee, capacity, weekdays) values ($1, $2, 'Kiểm thử Telegram', $3, 5, 1000000, 10, 'T2,T5') returning id`,
          [base.campus_id, className, base.teacher_id],
        )
      ).rows[0].id;
      const studentName = `HS Tele ${stamp}`;
      const studentId = (
        await db.query<{ id: number }>(`insert into students (full_name, gender, dob, start_date, class_id) values ($1, 'female', '2018-01-01', '2026-09-01', $2) returning id`, [studentName, classId])
      ).rows[0].id;
      const offsets = [-10, -7, -4, -1, 3];
      for (const [i, d] of offsets.entries()) {
        await db.query(
          `insert into class_sessions (class_id, session_no, starts_at, ends_at, teacher_id, room)
           values ($1, $2, date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' + ($3 || ' days')::interval + interval '10 hours',
                   date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' + ($3 || ' days')::interval + interval '11 hours', $4, 'P1')`,
          [classId, i + 1, String(d), base.teacher_id],
        );
      }
      // Đã vắng hai buổi trước đó
      await db.query(
        `insert into attendance (student_id, class_id, session_date, mark)
         select $1, $2, (cs.starts_at at time zone 'Asia/Ho_Chi_Minh')::date, 'absent' from class_sessions cs where cs.class_id = $2 and cs.session_no in (2, 3)`,
        [studentId, classId],
      );
      parentId = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH E2E điểm danh ${stamp}`, `05${stamp}42`])).rows[0].id;
      await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'mother', true)`, [studentId, parentId]);
      await db.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'E2E')`, [parentChat, parentId]);
      accountId = (
        await db.query<{ id: number }>(`insert into accounts (full_name, email, role, status, teacher_id) values ($1, $2, 'teacher', 'active', $3) returning id`, [
          `E2E GV điểm danh ${stamp}`,
          `e2e.tele.att.${stamp}@esl-center.vn`,
          base.teacher_id,
        ])
      ).rows[0].id;
      await db.query(`insert into telegram_chats (chat_id, account_id, display_name) values ($1, $2, 'E2E')`, [teacherChat, accountId]);

      // Mỗi lần lưu chờ dòng điểm danh đổi trong DB, không dựa vào toast (toast của lần lưu trước còn hiện, E-075)
      const savedAt = async () =>
        (await db.query<{ t: string }>(`select updated_at::text as t from attendance where student_id = $1 and session_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1`, [studentId])).rows[0]?.t ?? '';
      const save = async () => {
        const before = await savedAt();
        await page.getByRole('button', { name: 'Lưu điểm danh' }).first().click();
        await expect.poll(savedAt).not.toBe(before);
        await expectToast(page, 'Đã lưu điểm danh');
      };

      // Điểm danh buổi hôm qua (buổi đã bắt đầu gần nhất được chọn sẵn): vắng
      await login(page);
      await page.goto(`/diem-danh?cls=${classId}`);
      const group = page.getByRole('group', { name: `Điểm danh ${studentName}` });
      await group.getByRole('button', { name: 'Vắng' }).click();
      await save();
      await expect.poll(async () => (await outTexts(db, parentChat, 'absence')).filter((m) => m.text.includes('VẮNG')).length).toBe(1);
      // Vắng 3 buổi liên tiếp: giáo viên lớp nhận cảnh báo
      await expect.poll(async () => (await outTexts(db, teacherChat, 'absent_alert')).length).toBe(1);
      expect((await outTexts(db, teacherChat, 'absent_alert'))[0].text).toContain(`vắng 3 buổi liên tiếp`);

      // Lưu lại y nguyên: không gửi thêm
      await save();
      expect(await outTexts(db, parentChat, 'absence')).toHaveLength(1);
      // Sửa thành có mặt: phụ huynh nhận tin cập nhật
      await group.getByRole('button', { name: 'Có mặt' }).click();
      await save();
      await expect.poll(async () => (await outTexts(db, parentChat, 'absence')).filter((m) => m.text.includes('CÓ MẶT')).length).toBe(1);

      // Phụ huynh tắt "Buổi học bị huỷ hoặc đổi giờ" rồi bật lại, để kiểm cả hai chiều
      await b.tap(parentChat, 'pref:session_change');
      await b.tap(parentChat, 'pref:session_change');

      // Huỷ buổi sắp tới ở màn Lịch học: phụ huynh và giáo viên nhận tin
      const [future] = (await db.query<{ week: string }>(`select to_char(date_trunc('week', starts_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') as week from class_sessions where class_id = $1 and session_no = 5`, [classId])).rows;
      await page.goto(`/lich-hoc?w=${future.week}&cls=${classId}`);
      await page.getByRole('button', { name: new RegExp(`${className}.*Sắp học`) }).click();
      await page.getByLabel('Huỷ buổi này (ghi lý do)').fill('Giáo viên đi tập huấn');
      await page.getByRole('button', { name: 'Huỷ buổi học' }).click();
      await expectToast(page, 'Đã huỷ buổi');
      const cancelled = await outTexts(db, parentChat, 'session_change');
      expect(cancelled).toHaveLength(1);
      expect(cancelled[0].text).toContain('Giáo viên đi tập huấn');
      expect((await outTexts(db, teacherChat, 'session_change')).some((m) => m.text.includes('đã bị huỷ'))).toBe(true);
    } finally {
      const chats = [parentChat, teacherChat];
      await db.query(`delete from telegram_notification_log where chat_id = any($1::bigint[])`, [chats]);
      await db.query(`delete from telegram_messages where chat_id = any($1::bigint[])`, [chats]);
      await db.query(`delete from telegram_chats where chat_id = any($1::bigint[])`, [chats]);
      if (classId) {
        await db.query(`delete from attendance where class_id = $1`, [classId]);
        await db.query(`delete from students where class_id = $1`, [classId]);
        await db.query(`delete from classes where id = $1`, [classId]);
      }
      if (accountId) await db.query(`delete from accounts where id = $1`, [accountId]);
      if (parentId) await db.query(`delete from parents where id = $1`, [parentId]);
      await db.end();
    }
  });

  test('cài đặt nhận tin; bài mới, nhắc hạn và điểm mới gửi đúng một lần; tắt loại tin thì không gửi', async ({ page }) => {
    const { db, secret, stamp } = setup();
    await db.connect();
    const b = bot(page.request, secret);
    const chatId = 9_400_000_000 + Number(stamp);
    const title = uniq('BT tele');
    let parentId = 0;
    try {
      // Học sinh lớp IELTS-K14 (cls=2) có phụ huynh mới kết nối. Lớp này không được có phụ huynh kết nối thật,
      // vì bài mới và điểm mới gửi cho mọi phụ huynh của lớp (dev server có bot token thật).
      const real = (await db.query(`select 1 from students s join student_parents sp on sp.student_id = s.id join telegram_chats tc on tc.parent_id = sp.parent_id where s.class_id = 2 and tc.active`)).rows;
      expect(real).toEqual([]);
      const [kid] = (await db.query<{ id: number; full_name: string }>(`select id, full_name from students where class_id = 2 and status = 'active' order by id limit 1`)).rows;
      parentId = (await db.query<{ id: number }>(`insert into parents (full_name, phone) values ($1, $2) returning id`, [`PH E2E bài ${stamp}`, `07${stamp}31`])).rows[0].id;
      await db.query(`insert into student_parents (student_id, parent_id, relation, is_primary) values ($1, $2, 'father', false)`, [kid.id, parentId]);
      await db.query(`insert into telegram_chats (chat_id, parent_id, display_name) values ($1, $2, 'E2E')`, [chatId, parentId]);
      const muted = async () => (await db.query<{ muted_kinds: string[] }>(`select muted_kinds from telegram_chats where chat_id = $1`, [chatId])).rows[0].muted_kinds;

      // /caidat hiện danh sách; bấm Điểm mới thì tắt, bấm lại thì bật
      await b.text(chatId, '/caidat');
      expect((await outTexts(db, chatId)).some((m) => m.text.includes('CÀI ĐẶT NHẬN TIN'))).toBe(true);
      await b.tap(chatId, 'pref:score');
      expect(await muted()).toEqual(['score']);
      await b.tap(chatId, 'pref:score');
      expect(await muted()).toEqual([]);
      await b.tap(chatId, 'pref:khong-co');
      expect(await muted()).toEqual([]);

      // Giao bài mới trong app: phụ huynh nhận tin bài mới
      await login(page);
      await page.goto('/bai-tap?cls=2');
      await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
      const create = dialogById(page, 'assignment-create-title');
      await create.getByLabel('Tiêu đề *').fill(title);
      await create.getByLabel('Điểm tối đa *').fill('10');
      const tomorrow = new Date(Date.now() + 7 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
      await create.getByLabel('Hạn nộp (ngày) *').fill(tomorrow);
      await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
      await create.getByRole('button', { name: 'Tạo bài tập' }).click();
      await expectToast(page, `Đã tạo bài tập ${title}`);
      expect((await outTexts(db, chatId, 'homework_new')).filter((m) => m.text.includes(title))).toHaveLength(1);

      // Nhắc hạn: hạn còn 2 giờ, chạy cron hai lần chỉ một tin
      await db.query(`update assignments set due_at = now() + interval '2 hours' where title = $1`, [title]);
      for (let i = 0; i < 2; i++) {
        const res = await page.request.get(`/api/cron/telegram?key=${secret}&jobs=homework_due&chat=${chatId}`);
        expect(res.status()).toBe(200);
        expect((await res.json()).result.jobs).toEqual(['homework_due']);
      }
      expect((await outTexts(db, chatId, 'remind_homework')).filter((m) => m.text.includes(title))).toHaveLength(1);

      // Chấm điểm: phụ huynh nhận điểm và nhận xét; lưu lại y nguyên không gửi lại
      await page.getByRole('link', { name: title }).first().click();
      await page.waitForURL('**/bai-tap/*');
      await page.getByRole('button', { name: `Trạng thái của ${kid.full_name}` }).click();
      await page.getByRole('option', { name: 'Đã chấm' }).click();
      // Mỗi lần lưu chờ bài nộp đổi trong DB, không dựa vào toast của lần lưu trước (E-075)
      const savedAt = async () =>
        (
          await db.query<{ t: string }>(
            `select sub.updated_at::text as t from assignment_submissions sub join assignments a on a.id = sub.assignment_id where a.title = $1 and sub.student_id = $2`,
            [title, kid.id],
          )
        ).rows[0]?.t ?? '';
      const saveAll = async () => {
        const before = await savedAt();
        await page.getByRole('button', { name: 'Lưu tất cả' }).click();
        await expect.poll(savedAt).not.toBe(before);
        await expectToast(page, 'Đã lưu');
      };
      const scoreTexts = async () => (await outTexts(db, chatId, 'score')).filter((m) => m.text.includes(title));
      await page.getByLabel(`Điểm của ${kid.full_name}`).fill('8');
      await saveAll();
      await expect.poll(async () => (await scoreTexts()).length).toBe(1);
      await saveAll();
      const scores = await scoreTexts();
      expect(scores).toHaveLength(1);
      expect(scores[0].text).toContain('8/10');

      // Tắt "Điểm và nhận xét mới" rồi đổi điểm: không gửi thêm
      await b.tap(chatId, 'pref:score');
      await page.getByLabel(`Điểm của ${kid.full_name}`).fill('9');
      await saveAll();
      expect(await scoreTexts()).toHaveLength(1);

      // Tên việc lạ trong ?jobs bị bỏ qua; sai khoá thì 401
      expect((await page.request.get(`/api/cron/telegram?key=sai&jobs=weekly`)).status()).toBe(401);
      const odd = await page.request.get(`/api/cron/telegram?key=${secret}&jobs=khong-co,weekly&chat=${chatId}`);
      expect((await odd.json()).result.jobs).toEqual(['weekly']);
    } finally {
      await db.query(`delete from assignments where title = $1`, [title]);
      await db.query(`delete from telegram_notification_log where chat_id = $1`, [chatId]);
      await db.query(`delete from telegram_messages where chat_id = $1`, [chatId]);
      await db.query(`delete from telegram_chats where chat_id = $1`, [chatId]);
      if (parentId) await db.query(`delete from parents where id = $1`, [parentId]);
      await db.end();
    }
  });
});
