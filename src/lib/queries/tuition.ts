// Truy vấn học phí và báo cáo doanh thu. Chỉ chạy trên server.
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import type { CampusScope } from '@/lib/campus';
import { campusCond } from '@/lib/queries/campuses';
import { centerSettings, tuitionPayments } from '@/db/schema';
import { balanceOf, debtOf, dueDateFor, isOverdue, tuitionState, type TuitionState } from '@/lib/tuition';
import { parseStudentCode, studentCode } from '@/lib/student-code';
import { normalizeSearch } from '@/lib/text';
import { NET_FEE_SQL } from '@/lib/tuition-fee';

export type InvoiceRow = {
  id: number;
  code: string;
  fullName: string;
  status: 'active' | 'trial' | 'paused' | 'finished';
  className: string;
  fee: number; // phải nộp (đã trừ miễn giảm)
  baseFee: number; // học phí gốc (riêng hoặc của lớp), trần của miễn giảm
  discount: number; // miễn giảm cố định (VND)
  paid: number;
  debt: number; // còn nợ
  balance: number; // thừa (dương) hoặc thiếu (âm) so với phải nộp
  state: TuitionState;
  dueDate: string; // YYYY-MM-DD
  overdue: boolean;
  lastPaidDate: string | null;
};

export type InvoiceFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'overdue';

export async function getDueDay(): Promise<number> {
  const [row] = await db.select({ dueDay: centerSettings.dueDay }).from(centerSettings).where(eq(centerSettings.id, 1)).limit(1);
  return row?.dueDay ?? 10;
}

// Hoá đơn học phí của mọi học sinh: học phí lớp, số đã thu, còn nợ, hạn đóng, quá hạn.
// Học phí của học sinh trong cơ sở đang xem (scope null: mọi cơ sở). Số đếm và tổng nợ tính trên cơ sở đó.
export type InvoiceTotals = { due: number; discount: number; paid: number; balance: number };

export async function listInvoices(todayKey: string, q: string, filter: InvoiceFilter, scope: CampusScope): Promise<{ rows: InvoiceRow[]; counts: Record<InvoiceFilter, number>; totalDebt: number; totals: InvoiceTotals }> {
  // Ngày đến hạn và danh sách đọc cùng lúc
  const [dueDay, result] = await Promise.all([getDueDay(), db.execute<{
    id: number; full_name: string; search_key: string; status: InvoiceRow['status']; start_date: string; class_name: string;
    fee: number; base_fee: number; discount: number; paid: number; last_paid: string | null;
  }>(sql`
    SELECT s.id, s.full_name, s.search_key, s.status, s.start_date::text AS start_date, c.name AS class_name, ${NET_FEE_SQL} AS fee,
      COALESCE(s.tuition_fee, c.fee) AS base_fee, COALESCE(s.tuition_discount, 0)::int AS discount,
      COALESCE(p.paid, 0)::int AS paid,
      to_char(p.last_paid AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS last_paid
    FROM students s
    JOIN classes c ON c.id = s.class_id
    LEFT JOIN (
      SELECT student_id, SUM(amount)::int AS paid, MAX(paid_at) AS last_paid
      FROM tuition_payments GROUP BY student_id
    ) p ON p.student_id = s.id
    WHERE ${campusCond(scope, sql`c.campus_id`)}
    ORDER BY s.full_name
  `)]);

  const needle = normalizeSearch(q);
  const codeId = parseStudentCode(q);
  const all: InvoiceRow[] = result.rows.map((r) => {
    const debt = debtOf(r.fee, r.paid);
    const dueDate = dueDateFor(r.start_date, dueDay);
    return {
      id: r.id,
      code: studentCode(r.id),
      fullName: r.full_name,
      status: r.status,
      className: r.class_name,
      fee: r.fee,
      baseFee: r.base_fee,
      discount: r.discount,
      paid: r.paid,
      debt,
      balance: balanceOf(r.fee, r.paid),
      state: tuitionState(r.fee, r.paid),
      dueDate,
      overdue: isOverdue(r.fee, r.paid, dueDate, todayKey),
      lastPaidDate: r.last_paid,
    };
  });

  const counts: Record<InvoiceFilter, number> = { all: all.length, paid: 0, partial: 0, unpaid: 0, overdue: 0 };
  for (const r of all) {
    counts[r.state] += 1;
    if (r.overdue) counts.overdue += 1;
  }

  const rows = all
    .filter((r) => {
      if (needle && !normalizeSearch(`${r.fullName} ${r.code}`).includes(needle) && r.id !== codeId) return false;
      if (filter === 'all') return true;
      if (filter === 'overdue') return r.overdue;
      return r.state === filter;
    });

  const totals: InvoiceTotals = {
    due: all.reduce((sum, r) => sum + r.fee, 0),
    discount: all.reduce((sum, r) => sum + r.discount, 0),
    paid: all.reduce((sum, r) => sum + r.paid, 0),
    balance: all.reduce((sum, r) => sum + r.balance, 0),
  };
  return { rows, counts, totalDebt: all.reduce((sum, r) => sum + r.debt, 0), totals };
}

// kind: payment (khoản thu), refund (hoàn số dư), void (dòng huỷ một khoản thu). voided: khoản thu đã bị huỷ.
export type PaymentRow = { id: number; amount: number; paidDate: string; note: string; kind: 'payment' | 'refund' | 'void'; voided: boolean };

export async function listPaymentsOfStudent(studentId: number): Promise<PaymentRow[]> {
  const result = await db.execute<{ id: number; amount: number; paid_date: string; note: string; kind: PaymentRow['kind']; voided: boolean }>(sql`
    SELECT p.id, p.amount, to_char(p.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS paid_date, p.note, p.kind,
      EXISTS (SELECT 1 FROM tuition_payments v WHERE v.ref_id = p.id AND v.kind = 'void') AS voided
    FROM tuition_payments p WHERE p.student_id = ${studentId} ORDER BY p.paid_at DESC, p.id DESC
  `);
  return result.rows.map((r) => ({ id: r.id, amount: r.amount, paidDate: r.paid_date, note: r.note, kind: r.kind, voided: r.voided }));
}

export type RevenueReport = {
  month: string; // YYYY-MM
  total: number;
  count: number;
  byClass: { classId: number; name: string; total: number; count: number }[];
  trend: { month: string; total: number }[]; // sáu tháng gần nhất, tính đến tháng được chọn
};

// Doanh thu một tháng theo lớp, và xu hướng sáu tháng
// Doanh thu trong cơ sở đang xem (scope null: mọi cơ sở)
export async function getRevenueReport(month: string, monthsBack: string[], scope: CampusScope): Promise<RevenueReport> {
  const byClassRows = await db.execute<{ class_id: number; name: string; total: number; n: number }>(sql`
    SELECT c.id AS class_id, c.name, SUM(tp.amount)::int AS total, COUNT(tp.id)::int AS n
    FROM tuition_payments tp
    JOIN students s ON s.id = tp.student_id
    JOIN classes c ON c.id = s.class_id
    WHERE to_char(tp.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') = ${month}
      AND ${campusCond(scope, sql`c.campus_id`)}
    GROUP BY c.id, c.name
    ORDER BY total DESC, c.name
  `);
  const trendRows = await db.execute<{ month: string; total: number }>(sql`
    SELECT to_char(tp.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month, SUM(tp.amount)::int AS total
    FROM tuition_payments tp
    JOIN students s ON s.id = tp.student_id
    JOIN classes c ON c.id = s.class_id
    WHERE to_char(tp.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') IN (${sql.join(monthsBack.map((m) => sql`${m}`), sql`, `)})
      AND ${campusCond(scope, sql`c.campus_id`)}
    GROUP BY 1
  `);
  const trendMap = new Map(trendRows.rows.map((r) => [r.month, r.total]));
  const byClass = byClassRows.rows.map((r) => ({ classId: r.class_id, name: r.name, total: r.total, count: r.n }));
  return {
    month,
    total: byClass.reduce((s, r) => s + r.total, 0),
    count: byClass.reduce((s, r) => s + r.count, 0),
    byClass,
    trend: monthsBack.map((m) => ({ month: m, total: trendMap.get(m) ?? 0 })),
  };
}

// Tổng số tiền đã thu của học sinh, dùng để kiểm tra không thu quá số còn nợ
export async function paidOf(studentId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${tuitionPayments.amount}), 0)::int` })
    .from(tuitionPayments)
    .where(eq(tuitionPayments.studentId, studentId));
  return Number(row?.total ?? 0);
}
