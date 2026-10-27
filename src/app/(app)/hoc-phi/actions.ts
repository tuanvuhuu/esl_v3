'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { classes, students, tuitionPayments } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { getCurrentAccount } from '@/lib/session';
import { notifyParentsOfStudent } from '@/lib/telegram/service';
import { parentChatsOfStudent, sendPhotoAndRecord } from '@/lib/telegram/core';
import { tuitionQr } from '@/lib/tuition-qr';
import { requireStudentAccess } from '@/lib/campus-access';
import { formatVND } from '@/lib/money';
import { listPaymentsOfStudent, paidOf, type PaymentRow } from '@/lib/queries/tuition';
import { debtOf } from '@/lib/tuition';
import { netFee } from '@/lib/tuition-fee';
import { z } from 'zod';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

const paymentSchema = z.object({
  amount: z.coerce
    .number({ error: 'Vui lòng nhập số tiền' })
    .int('Số tiền phải là số nguyên VND')
    .min(1, 'Số tiền phải lớn hơn 0'),
  note: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự').default(''),
});

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action học phí:', error);
  return { ok: false, message: 'Không ghi nhận được. Thử lại sau ít phút.' };
}

// Số tiền còn nợ của một học sinh: học phí (riêng của học sinh, hoặc của lớp) trừ tổng đã thu
async function studentBalance(studentId: number): Promise<{ name: string; fee: number; paid: number; debt: number } | null> {
  const [row] = await db
    .select({ name: students.fullName, fee: classes.fee, ownFee: students.tuitionFee, discount: students.tuitionDiscount })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.id, studentId))
    .limit(1);
  if (!row) return null;
  const paid = await paidOf(studentId);
  const fee = netFee(row.ownFee ?? row.fee, row.discount);
  return { name: row.name, fee, paid, debt: debtOf(fee, paid) };
}

// Ghi một khoản thu vào sổ. Không thu quá số còn nợ.
export async function recordPaymentAction(studentId: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const balance = await studentBalance(studentId);
    if (!balance) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    if (balance.debt <= 0) return { ok: false, message: `${balance.name} đã đóng đủ học phí.` };
    if (v.amount > balance.debt) {
      return { ok: false, message: `Số tiền vượt số còn nợ (${formatVND(balance.debt)}).`, fieldErrors: { amount: `Tối đa ${formatVND(balance.debt)}` } };
    }

    await db.insert(tuitionPayments).values({ studentId, amount: v.amount, note: v.note, paidAt: new Date() });
    const remaining = balance.debt - v.amount;
    await writeAudit({ action: 'payment', entity: 'student', entityId: studentId, summary: `Thu ${formatVND(v.amount)} học phí ${balance.name}, còn nợ ${formatVND(remaining)}` });
    revalidatePath('/hoc-phi');
    revalidatePath('/hoc-sinh');
    revalidatePath(`/hoc-sinh/${studentId}`);
    revalidatePath('/bao-cao');
    revalidatePath('/tong-quan');
    return { ok: true, message: remaining > 0 ? `Đã thu ${formatVND(v.amount)}. ${balance.name} còn nợ ${formatVND(remaining)}.` : `Đã thu đủ học phí của ${balance.name}.` };
  } catch (error) {
    return errorResult(error);
  }
}

// Ghi thu cho nhiều học sinh cùng lúc. Kiểm tra hết trước: chỉ cần một dòng sai thì không ghi dòng nào.
const bulkPaymentSchema = z.object({
  items: z
    .array(z.object({ studentId: z.number().int().positive(), amount: z.number().int().min(1, 'Số tiền phải lớn hơn 0') }))
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
    const plan: { studentId: number; name: string; amount: number; debt: number }[] = [];
    for (const item of parsed.data.items) {
      await requireStudentAccess(item.studentId);
      const balance = await studentBalance(item.studentId);
      if (!balance) problems.push(`học sinh #${item.studentId} không còn tồn tại`);
      else if (balance.debt <= 0) problems.push(`${balance.name} đã đóng đủ học phí`);
      else if (item.amount > balance.debt) problems.push(`${balance.name} còn nợ ${formatVND(balance.debt)}, không thu ${formatVND(item.amount)}`);
      else plan.push({ studentId: item.studentId, name: balance.name, amount: item.amount, debt: balance.debt });
    }
    if (problems.length > 0) return { ok: false, message: `Chưa ghi thu. Sửa các dòng sau: ${problems.join('; ')}.` };

    const paidAt = new Date();
    await db.transaction(async (tx) => {
      for (const p of plan) {
        await tx.insert(tuitionPayments).values({ studentId: p.studentId, amount: p.amount, note: parsed.data.note, paidAt });
      }
    });
    for (const p of plan) {
      await writeAudit({ action: 'payment', entity: 'student', entityId: p.studentId, summary: `Thu ${formatVND(p.amount)} học phí ${p.name} (ghi thu nhiều học sinh), còn nợ ${formatVND(p.debt - p.amount)}` });
    }
    revalidatePath('/hoc-phi');
    revalidatePath('/hoc-sinh');
    revalidatePath('/bao-cao');
    revalidatePath('/tong-quan');
    const total = plan.reduce((sum, p) => sum + p.amount, 0);
    return { ok: true, message: `Đã ghi thu cho ${plan.length} học sinh, tổng ${formatVND(total)}.` };
  } catch (error) {
    return errorResult(error);
  }
}

// Nhắc đóng học phí. Ghi vào nhật ký. Chưa gửi SMS hay email vì chưa có kênh gửi.
export async function remindTuitionAction(studentId: number): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const balance = await studentBalance(studentId);
    if (!balance) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    if (balance.debt <= 0) return { ok: false, message: `${balance.name} đã đóng đủ học phí, không cần nhắc.` };
    await writeAudit({ action: 'remind', entity: 'student', entityId: studentId, summary: `Nhắc đóng học phí ${balance.name}: còn thiếu ${formatVND(balance.debt)}` });
    revalidatePath('/hoc-phi');
    // Gửi cho phụ huynh đã kết nối Telegram (P34). Trung tâm có tài khoản nhận học phí thì kèm ảnh mã VietQR (37.13):
    // phụ huynh quét bằng app ngân hàng, số tiền còn thiếu và nội dung điền sẵn.
    const account = await getCurrentAccount();
    const text = `ESL Center xin nhắc: học phí của ${balance.name} còn thiếu ${formatVND(balance.debt)} (đã đóng ${formatVND(balance.paid)} / ${formatVND(balance.fee)}). Phụ huynh gõ /hocphi để xem lại bất cứ lúc nào.`;
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

// Lịch sử thu của một học sinh và mã QR khoản còn thiếu (nếu có tài khoản nhận học phí), cho hộp thoại ghi thu
export async function loadPaymentsAction(studentId: number): Promise<{ ok: true; payments: PaymentRow[]; qr: { payload: string; bankLine: string } | null } | { ok: false; message: string }> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const balance = await studentBalance(studentId);
    const qr = balance && balance.debt > 0 ? await tuitionQr(studentId, balance.name, balance.debt) : null;
    return { ok: true, payments: await listPaymentsOfStudent(studentId), qr: qr ? { payload: qr.payload, bankLine: qr.bankLine } : null };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc lịch sử thu:', error);
    return { ok: false, message: 'Không đọc được lịch sử thu.' };
  }
}

// Đặt miễn giảm cố định (VND) cho một học sinh, sửa trực tiếp ở ô Miễn giảm của bảng học phí.
// Không phần trăm. Không được lớn hơn học phí gốc (học phí riêng, hoặc học phí lớp).
export async function setTuitionDiscountAction(studentId: number, discount: number): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const parsed = z.number().int().min(0).max(1_000_000_000).safeParse(discount);
    if (!parsed.success) return { ok: false, message: 'Số tiền miễn giảm không hợp lệ.' };
    const [row] = await db
      .select({ name: students.fullName, ownFee: students.tuitionFee, classFee: classes.fee, discount: students.tuitionDiscount })
      .from(students)
      .innerJoin(classes, eq(classes.id, students.classId))
      .where(eq(students.id, studentId))
      .limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    const base = row.ownFee ?? row.classFee;
    if (parsed.data > base) {
      return { ok: false, message: `Miễn giảm không được lớn hơn học phí ${formatVND(base)}.`, fieldErrors: { discount: `Tối đa ${formatVND(base)}` } };
    }
    // Đã đóng đủ học phí thì không thêm miễn giảm được (chỉ được giảm miễn giảm đi)
    if (parsed.data > row.discount && (await paidOf(studentId)) >= netFee(base, row.discount)) {
      return { ok: false, message: `${row.name} đã đóng đủ học phí nên không thêm miễn giảm được.`, fieldErrors: { discount: 'Đã đóng đủ học phí' } };
    }
    await db.update(students).set({ tuitionDiscount: parsed.data, updatedAt: new Date() }).where(eq(students.id, studentId));
    await writeAudit({ action: 'update', entity: 'student', entityId: studentId, summary: `Đặt miễn giảm học phí ${row.name}: ${formatVND(parsed.data)}` });
    revalidatePath('/hoc-phi');
    revalidatePath('/hoc-sinh');
    revalidatePath(`/hoc-sinh/${studentId}`);
    revalidatePath('/tong-quan');
    return { ok: true, message: `Đã lưu miễn giảm ${formatVND(parsed.data)} cho ${row.name}` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đặt miễn giảm học phí:', error);
    return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
  }
}

// Huỷ một khoản thu đã ghi nhầm. Không xoá dòng cũ: ghi thêm một dòng huỷ có số âm, có lý do, để sổ thu còn nguyên vết.
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

    await db.insert(tuitionPayments).values({
      studentId: pay.studentId,
      amount: -pay.amount,
      kind: 'void',
      refId: paymentId,
      note: `Huỷ khoản thu ${formatVND(pay.amount)}: ${why}`.slice(0, 200),
      paidAt: new Date(),
    });
    await writeAudit({ action: 'void', entity: 'student', entityId: pay.studentId, summary: `Huỷ khoản thu ${formatVND(pay.amount)} (#${paymentId}): ${why}` });
    revalidatePath('/hoc-phi');
    revalidatePath(`/hoc-sinh/${pay.studentId}`);
    revalidatePath('/bao-cao');
    revalidatePath('/tong-quan');
    return { ok: true, message: `Đã huỷ khoản thu ${formatVND(pay.amount)}` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi huỷ khoản thu:', error);
    return { ok: false, message: 'Không huỷ được. Thử lại sau ít phút.' };
  }
}

// Hoàn số dư (đã đóng dư) cho học sinh đã nghỉ hoặc đang bảo lưu. Ghi một dòng hoàn có số âm, không vượt số dư.
export async function refundSurplusAction(studentId: number, amount: number, note: string): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const [row] = await db
      .select({ name: students.fullName, status: students.status, ownFee: students.tuitionFee, classFee: classes.fee, discount: students.tuitionDiscount })
      .from(students)
      .innerJoin(classes, eq(classes.id, students.classId))
      .where(eq(students.id, studentId))
      .limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    if (row.status !== 'finished' && row.status !== 'paused') {
      return { ok: false, message: 'Chỉ hoàn số dư cho học sinh đã nghỉ hoặc đang bảo lưu.' };
    }
    const fee = netFee(row.ownFee ?? row.classFee, row.discount);
    const surplus = (await paidOf(studentId)) - fee;
    if (surplus <= 0) return { ok: false, message: `${row.name} không có số dư để hoàn.` };
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
    await writeAudit({ action: 'refund', entity: 'student', entityId: studentId, summary: `Hoàn ${formatVND(amount)} số dư học phí ${row.name}${why ? `: ${why}` : ''}` });
    revalidatePath('/hoc-phi');
    revalidatePath(`/hoc-sinh/${studentId}`);
    revalidatePath('/bao-cao');
    revalidatePath('/tong-quan');
    return { ok: true, message: `Đã hoàn ${formatVND(amount)} cho ${row.name}. Còn dư ${formatVND(surplus - amount)}.` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi hoàn số dư:', error);
    return { ok: false, message: 'Không hoàn được. Thử lại sau ít phút.' };
  }
}
