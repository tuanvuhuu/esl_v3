// Đồng ý của phụ huynh (P35.12). Chỉ chạy trên server.
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, parentConsents, parents, studentParents, students } from '@/db/schema';
import { CONSENT_TERMS_VERSION, voiceAccess, type ConsentPurpose, type ConsentRow } from '@/lib/consent';
import { todayKeyVN } from '@/lib/datetime';

export type ConsentEntry = ConsentRow & {
  id: number;
  parentName: string | null;
  channel: string;
  note: string;
  termsVersion: string;
  recordedByName: string | null;
};

// Mọi lần đồng ý, từ chối của học sinh, mới nhất trước (để hiện lịch sử và tính trạng thái)
export async function listConsents(studentId: number): Promise<ConsentEntry[]> {
  const rows = await db
    .select({
      id: parentConsents.id,
      purpose: parentConsents.purpose,
      granted: parentConsents.granted,
      decidedAt: parentConsents.decidedAt,
      withdrawnAt: parentConsents.withdrawnAt,
      childAgreedAt: parentConsents.childAgreedAt,
      parentName: parents.fullName,
      channel: parentConsents.channel,
      note: parentConsents.note,
      termsVersion: parentConsents.termsVersion,
      recordedByName: accounts.fullName,
    })
    .from(parentConsents)
    .leftJoin(parents, eq(parents.id, parentConsents.parentId))
    .leftJoin(accounts, eq(accounts.id, parentConsents.recordedByAccountId))
    .where(eq(parentConsents.studentId, studentId))
    .orderBy(desc(parentConsents.decidedAt), desc(parentConsents.id));
  return rows;
}

export async function recordConsent(input: {
  studentId: number;
  purpose: ConsentPurpose;
  granted: boolean;
  parentId: number | null;
  channel: 'telegram' | 'staff' | 'demo';
  note?: string;
  recordedByAccountId: number | null;
  childAgreed?: boolean;
}): Promise<void> {
  await db.insert(parentConsents).values({
    studentId: input.studentId,
    purpose: input.purpose,
    granted: input.granted,
    parentId: input.parentId,
    channel: input.channel,
    termsVersion: CONSENT_TERMS_VERSION,
    note: input.note ?? '',
    recordedByAccountId: input.recordedByAccountId,
    childAgreedAt: input.childAgreed ? new Date() : null,
  });
}

// Rút lại đồng ý đang có hiệu lực. Trả false khi không có gì để rút.
export async function withdrawConsent(studentId: number, purpose: ConsentPurpose): Promise<boolean> {
  const rows = await db
    .update(parentConsents)
    .set({ withdrawnAt: new Date() })
    .where(and(eq(parentConsents.studentId, studentId), eq(parentConsents.purpose, purpose), eq(parentConsents.granted, true), isNull(parentConsents.withdrawnAt)))
    .returning({ id: parentConsents.id });
  return rows.length > 0;
}

// Trẻ từ 7 tuổi tự bấm đồng ý ghi âm (ghi vào dòng đồng ý đang có hiệu lực của phụ huynh)
export async function recordChildAgreement(studentId: number): Promise<boolean> {
  const rows = await db
    .update(parentConsents)
    .set({ childAgreedAt: new Date() })
    .where(
      and(eq(parentConsents.studentId, studentId), eq(parentConsents.purpose, 'voice_teacher_review'), eq(parentConsents.granted, true), isNull(parentConsents.withdrawnAt), isNull(parentConsents.childAgreedAt)),
    )
    .returning({ id: parentConsents.id });
  return rows.length > 0;
}

// Học sinh có được ghi âm không (dùng ở khu học sinh và khi lưu tệp ghi âm)
export async function studentVoiceAccess(studentId: number): Promise<{ allowed: boolean; needsChild: boolean }> {
  const [student] = await db.select({ dob: students.dob }).from(students).where(eq(students.id, studentId)).limit(1);
  if (!student) return { allowed: false, needsChild: false };
  const rows = await listConsents(studentId);
  return voiceAccess(rows, student.dob, todayKeyVN());
}

// Phụ huynh có phải phụ huynh của học sinh này không (khi phụ huynh bấm nút trên bot)
export async function isParentOf(parentId: number, studentId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: studentParents.id })
    .from(studentParents)
    .where(and(eq(studentParents.parentId, parentId), eq(studentParents.studentId, studentId)))
    .limit(1);
  return !!row;
}
