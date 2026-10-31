'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { students, tuitionPayments } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { getCurrentAccount } from '@/lib/session';
import { notifyParentsOfStudent } from '@/lib/telegram/service';
import { parentChatsOfStudent, sendPhotoAndRecord } from '@/lib/telegram/core';
import { tuitionQr } from '@/lib/tuition-qr';
import { requireStudentAccess } from '@/lib/campus-access';
import { formatVND } from '@/lib/money';
import { creditOf, listPaymentsOfStudent, paidOf, type PaymentRow } from '@/lib/queries/tuition';
import { debtOf, sessionsBought, TUITION_PER_SESSION } from '@/lib/tuition';
import { netFee } from '@/lib/tuition-fee';
import { z } from 'zod';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

// Học phí theo buổi (src/lib/tuition.ts): đăng ký bao nhiêu cũng được, không giới hạn số lần.
// Mỗi lần thu nhập học phí của số buổi đăng ký và giảm trừ; phụ huynh trả (doanh thu) = học phí − giảm trừ.
// Sổ thu lưu amount = tiền phụ huynh trả, discount = giảm trừ, nên amount + discount = học phí quy ra buổi.
const money = (label: string) =>
  z.coerce
    .number({ error: `${label} phải là số` })
    .int(`${label} phải là số nguyên VND`)
    .min(0, `${label} không được âm`)
    .max(1_000_000_000, `${label} quá lớn`);

const paymentSchema = z
  .object({
    fee: money('Học phí'),
    discount: money('Giảm trừ').default(0),
    note: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự').default(''),
  })
  .refine((v) => v.fee > 0, { message: 'Nhập học phí của số buổi đăng ký', path: ['fee'] })
  .refine((v) => v.discount <= v.fee, { message: 'Giảm trừ không được lớn hơn học phí', path: ['discount'] });

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action học phí:', error);
  return { ok: false, message: 'Không ghi nhận được. Thử lại sau ít phút.' };
}

type Balance = { name: string; fee: number; credit: number; debt: number; bought: number; done: number; left: number };

// Tình trạng học phí theo buổi của một học sinh
async function studentBalance(studentId: number): Promise<Balance | null> {
  const [row] = await db
    .select({ name: students.fullName, done: students.sessionsDone })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (!row) return null;
  const credit = await creditOf(studentId);
  const fee = netFee(row.done);
  const bought = sessionsBought(credit);
  return { name: row.name, fee, credit, debt: debtOf(fee, credit), bought, done: row.done, left: bought - row.done };
}

// Câu báo số buổi sau khi thu
function sessionsLine(b: Balance): string {
  return b.left >= 0 ? `đã mua ${b.bought} buổi, đã học ${b.done}, còn ${b.left} buổi` : `đã mua ${b.bought} buổi, đã học ${b.done}, còn nợ ${-b.left} buổi`;
}

function revalidateTuition(studentId?: number) {
  revalidatePath('/hoc-phi');
  revalidatePath('/hoc-sinh');
  if (studentId) revalidatePath(`/hoc-sinh/${studentId}`);
  revalidatePath('/bao-cao');
  revalidatePath('/tong-quan');
}

// Ghi một khoản thu: học phí của số buổi đăng ký, giảm trừ, phụ huynh trả phần còn lại. Số buổi đã mua tự tăng theo học phí.
export async function recordPaymentAction(studentId: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const before = await studentBalance(studentId);
    if (!before) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };

    const cash = v.fee - v.discount;
    await db.insert(tuitionPayments).values({ studentId, amount: cash, discount: v.discount, note: v.note, paidAt: new Date() });
    const after = (await studentBalance(studentId)) ?? before;
    const disc = v.discount > 0 ? ` (học phí ${formatVND(v.fee)}, giảm trừ ${formatVND(v.discount)})` : '';
    await writeAudit({ action: 'payment', entity: 'student', entityId: studentId, summary: `Thu ${formatVND(cash)}${disc} học phí ${after.name}: ${sessionsLine(after)}` });
    revalidateTuition(studentId);
    return { ok: true, message: `Đã thu ${formatVND(cash)}${disc}. ${after.name} ${sessionsLine(after)}.` };
  } catch (error) {
    return errorResult(error);
  }
}

// Ghi thu cho nhiều học sinh cùng lúc. Kiểm tra hết trước: chỉ cần một dòng sai thì không ghi dòng nào.
const bulkPaymentSchema = z.object({
  items: z
    .array(z.object({ studentId: z.number().int().positive(), amount: z.number().int().min(1, 'Số tiền phải lớn hơn 0').max(1_000_000_000) }))
    .min(1, 'Chưa chọn học sinh nào')
    .max(200, 'Tối đa 200 học sinh mỗi lần'),
  note: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự').default(''),
});

export async function recordPaymentsBulkAction(input: { items: { studentId: number; amount: number }[]; note: string }): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    const parsed = bulkPaymentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' };
    const ids = parsed.data.items.map((i) => i.studentId);
    if (new Set(ids).size !== ids.length) return { ok: false, message: 'Có học sinh được chọn hai lần.' };

    const problems: string[] = [];
    const plan: { studentId: number; name: string; amount: number }[] = [];
    for (const item of parsed.data.items) {
      await requireStudentAccess(item.studentId);
      const balance = await studentBalance(item.studentId);
      if (!balance) problems.push(`học sinh #${item.studentId} không còn tồn tại`);
      else plan.push({ studentId: item.studentId, name: balance.name, amount: item.amount });
    }
    if (problems.length > 0) return { ok: false, message: `Chưa ghi thu. Sửa các dòng sau: ${problems.join('; ')}.` };

    const paidAt = new Date();
    await db.transaction(async (tx) => {
      for (const p of plan) {
        await tx.insert(tuitionPayments).values({ studentId: p.studentId, amount: p.amount, note: parsed.data.note, paidAt });
      }
    });
    for (const p of plan) {
      const after = await studentBalance(p.studentId);
      await writeAudit({ action: 'payment', entity: 'student', entityId: p.studentId, summary: `Thu ${formatVND(p.amount)} học phí ${p.name} (ghi thu nhiều học sinh)${after ? `: ${sessionsLine(after)}` : ''}` });
    }
    revalidateTuition();
    const total = plan.reduce((sum, p) => sum + p.amount, 0);
    return { ok: true, message: `Đã ghi thu cho ${plan.length} học sinh, tổng ${formatVND(total)}.` };
  } catch (error) {
    return errorResult(error);
  }
}

// Số buổi còn lại từ mức này trở xuống thì nhắc đóng tiếp
const LOW_SESSIONS = 2;

// Nhắc đóng học phí: khi đang nợ (học quá số buổi đã mua) hoặc sắp hết buổi đã mua. Gửi phụ huynh qua Telegram.
export async function remindTuitionAction(studentId: number): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const balance = await studentBalance(studentId);
    if (!balance) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    if (balance.debt <= 0 && balance.left > LOW_SESSIONS) return { ok: false, message: `${balance.name} còn ${balance.left} buổi đã đóng, chưa cần nhắc.` };
    const status = balance.debt > 0 ? `đang nợ ${formatVND(balance.debt)} (${-balance.left} buổi đã học chưa đóng)` : `chỉ còn ${balance.left} buổi đã đóng`;
    await writeAudit({ action: 'remind', entity: 'student', entityId: studentId, summary: `Nhắc đóng học phí ${balance.name}: ${status}` });
    revalidatePath('/hoc-phi');
    // Gửi cho phụ huynh đã kết nối Telegram (P34). Trung tâm có tài khoản nhận học phí thì kèm ảnh mã VietQR (37.13).
    const account = await getCurrentAccount();
    const text = `ESL Center xin nhắc: học phí của ${balance.name} ${status}. Học phí ${formatVND(TUITION_PER_SESSION)} một buổi, nộp bao nhiêu thì cộng bấy nhiêu buổi. Phụ huynh gõ /hocphi để xem lại bất cứ lúc nào.`;
    const qr = await tuitionQr(studentId, balance.name, balance.debt);
    let sent: { chats: number; delivered: number };
    if (qr) {
      const chats = await parentChatsOfStudent(studentId);
      const caption = `${text}

Quét mã QR bằng app ngân hàng để chuyển khoản:
${qr.bankLine}`;
      let delivered = 0;
      for (const chat of chats) if (await sendPhotoAndRecord(chat, qr.png, caption, 'tuition', account?.id ?? null)) delivered++;
      sent = { chats: chats.length, delivered };
    } else {
      sent = await notifyParentsOfStudent(studentId, text, 'tuition', account?.id ?? null);
    }
    if (sent.delivered > 0) return { ok: true, message: `Đã gửi nhắc học phí qua Telegram cho phụ huynh của ${balance.name}.` };
    if (sent.chats > 0) return { ok: true, message: `Đã ghi nhắc đóng cho ${balance.name}, nhưng chưa gửi được qua Telegram (chưa cấu hình bot hoặc lỗi mạng).` };
    return { ok: true, message: `Đã ghi nhắc đóng cho ${balance.name}. Phụ huynh chưa kết nối Telegram nên chưa gửi tin.` };
  } catch (error) {
    return errorResult(error);
  }
}

// Lịch sử thu của một học sinh và mã QR (số tiền đang nợ, hoặc để phụ huynh tự nhập), cho hộp thoại ghi thu
export async function loadPaymentsAction(studentId: number): Promise<{ ok: true; payments: PaymentRow[]; qr: { payload: string; bankLine: string } | null } | { ok: false; message: string }> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const balance = await studentBalance(studentId);
    const qr = balance ? await tuitionQr(studentId, balance.name, balance.debt) : null;
    return { ok: true, payments: await listPaymentsOfStudent(studentId), qr: qr ? { payload: qr.payload, bankLine: qr.bankLine } : null };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc lịch sử thu:', error);
    return { ok: false, message: 'Không đọc được lịch sử thu.' };
  }
}

// Huỷ một khoản thu đã ghi nhầm. Không xoá dòng cũ: ghi thêm một dòng huỷ có số âm (cả tiền và giảm trừ), có lý do.
export async function voidPaymentAction(paymentId: number, reason: string): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    const why = reason.trim();
    if (why.length < 3) return { ok: false, message: 'Ghi rõ lý do huỷ khoản thu (ít nhất 3 ký tự).', fieldErrors: { reason: 'Cần ghi lý do' } };
    if (why.length > 150) return { ok: false, message: 'Lý do huỷ tối đa 150 ký tự.', fieldErrors: { reason: 'Tối đa 150 ký tự' } };
    const [pay] = await db.select().from(tuitionPayments).where(eq(tuitionPayments.id, paymentId)).limit(1);
    if (!pay) return { ok: false, message: 'Không tìm thấy khoản thu này.' };
    await requireStudentAccess(pay.studentId);
    if (pay.kind !== 'payment') return { ok: false, message: 'Chỉ huỷ được khoản thu, không huỷ được dòng hoàn hay dòng huỷ.' };
    const [done] = await db.select({ id: tuitionPayments.id }).from(tuitionPayments).where(and(eq(tuitionPayments.refId, paymentId), eq(tuitionPayments.kind, 'void'))).limit(1);
    if (done) return { ok: false, message: 'Khoản thu này đã được huỷ.' };
    const paid = await paidOf(pay.studentId);
    if (paid - pay.amount < 0) return { ok: false, message: 'Không huỷ được: học sinh đã được hoàn tiền từ khoản này. Xử lý phần hoàn trước.' };

    const disc = pay.discount > 0 ? `, giảm trừ ${formatVND(pay.discount)}` : '';
    await db.insert(tuitionPayments).values({
      studentId: pay.studentId,
      amount: -pay.amount,
      discount: -pay.discount,
      kind: 'void',
      refId: paymentId,
      note: `Huỷ khoản thu ${formatVND(pay.amount)}${disc}: ${why}`.slice(0, 200),
      paidAt: new Date(),
    });
    await writeAudit({ action: 'void', entity: 'student', entityId: pay.studentId, summary: `Huỷ khoản thu ${formatVND(pay.amount)}${disc} (#${paymentId}): ${why}` });
    revalidateTuition(pay.studentId);
    return { ok: true, message: `Đã huỷ khoản thu ${formatVND(pay.amount)}${disc}` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi huỷ khoản thu:', error);
    return { ok: false, message: 'Không huỷ được. Thử lại sau ít phút.' };
  }
}

// Hoàn tiền trước (buổi đã mua chưa học) cho học sinh đã nghỉ hoặc đang bảo lưu. Không vượt số dư và không vượt tiền đã thu.
export async function refundSurplusAction(studentId: number, amount: number, note: string): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const [row] = await db.select({ status: students.status }).from(students).where(eq(students.id, studentId)).limit(1);
    const balance = await studentBalance(studentId);
    if (!row || !balance) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    if (row.status !== 'finished' && row.status !== 'paused') {
      return { ok: false, message: 'Chỉ hoàn số dư cho học sinh đã nghỉ hoặc đang bảo lưu.' };
    }
    const surplus = Math.min(balance.credit - balance.fee, await paidOf(studentId));
    if (surplus <= 0) return { ok: false, message: `${balance.name} không có số dư để hoàn.` };
    if (!Number.isInteger(amount) || amount < 1 || amount > surplus) {
      return { ok: false, message: `Số tiền hoàn từ 1 đến ${formatVND(surplus)}.`, fieldErrors: { amount: `Tối đa ${formatVND(surplus)}` } };
    }
    const why = note.trim().slice(0, 150);
    await db.insert(tuitionPayments).values({
      studentId,
      amount: -amount,
      kind: 'refund',
      note: `Hoàn ${formatVND(amount)}${why ? `: ${why}` : ''}`.slice(0, 200),
      paidAt: new Date(),
    });
    await writeAudit({ action: 'refund', entity: 'student', entityId: studentId, summary: `Hoàn ${formatVND(amount)} số dư học phí ${balance.name}${why ? `: ${why}` : ''}` });
    revalidateTuition(studentId);
    return { ok: true, message: `Đã hoàn ${formatVND(amount)} cho ${balance.name}. Còn dư ${formatVND(surplus - amount)}.` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi hoàn số dư:', error);
    return { ok: false, message: 'Không hoàn được. Thử lại sau ít phút.' };
  }
}
