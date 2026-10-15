// Việc cần chú ý cho chuông thông báo, cùng nguồn với mục Cần chú ý ở Tổng quan. Chỉ đọc, không ghi. Chỉ chạy trên server.
import type { CampusScope } from '@/lib/campus';
import { dateKeyLabel, vnDateTimeLabel } from '@/lib/datetime';
import { formatVND } from '@/lib/money';
import { hasPermission, type Permission } from '@/lib/permissions';
import { listOverdueAssignments } from '@/lib/queries/assignments';
import { listFrequentAbsentees } from '@/lib/queries/dashboard';
import { listInvoices } from '@/lib/queries/tuition';

export type AttentionItem = { id: string; title: string; meta: string; right: string; href: string };
export type AttentionGroup = { key: 'debt' | 'absence' | 'assignment'; title: string; count: number; href: string; items: AttentionItem[] };

// Số mục hiện trong mỗi nhóm. Nhóm đếm đủ, phần còn lại có liên kết "Xem tất cả".
const SHOW = 5;

// Việc cần chú ý theo quyền của người dùng, trong cơ sở đang xem. Nhóm không có việc nào thì không trả về.
export async function listAttentionGroups(granted: Set<Permission>, today: string, scope: CampusScope): Promise<AttentionGroup[]> {
  const canStudents = hasPermission(granted, 'students.view');
  const canTuition = hasPermission(granted, 'tuition.manage');
  const canAssignments = hasPermission(granted, 'assignments.manage') || canStudents;
  const [invoices, absentees, assignments] = await Promise.all([
    canTuition ? listInvoices(today, '', 'overdue', scope) : Promise.resolve(null),
    canStudents ? listFrequentAbsentees(today, scope) : Promise.resolve([]),
    canAssignments ? listOverdueAssignments(scope) : Promise.resolve([]),
  ]);

  const groups: AttentionGroup[] = [];
  if (invoices) {
    const top = [...invoices.rows].sort((a, b) => b.debt - a.debt).slice(0, SHOW);
    groups.push({
      key: 'debt',
      title: 'Công nợ quá hạn',
      count: invoices.counts.overdue,
      href: '/hoc-phi?f=overdue',
      items: top.map((r) => ({
        id: `debt-${r.id}`,
        title: r.fullName,
        meta: `${r.className} · hạn ${dateKeyLabel(r.dueDate)}`,
        right: formatVND(r.debt),
        href: `/hoc-phi?f=overdue&q=${encodeURIComponent(r.fullName)}`,
      })),
    });
  }
  groups.push({
    key: 'absence',
    title: 'Vắng từ hai buổi trở lên trong 7 ngày',
    count: absentees.length,
    href: '/hoc-sinh',
    items: absentees.slice(0, SHOW).map((a) => ({
      id: `absence-${a.studentId}`,
      title: a.fullName,
      meta: a.className,
      right: `${a.absences} buổi vắng`,
      href: `/hoc-sinh/${a.studentId}`,
    })),
  });
  groups.push({
    key: 'assignment',
    title: 'Bài tập quá hạn',
    count: assignments.length,
    href: '/bai-tap',
    items: assignments.slice(0, SHOW).map((a) => ({
      id: `assignment-${a.id}`,
      title: a.title,
      meta: `${a.className} · hạn ${vnDateTimeLabel(new Date(a.dueAt))}`,
      right: `còn ${a.enrolled - a.done} chưa nộp`,
      href: `/bai-tap/${a.id}`,
    })),
  });
  return groups.filter((g) => g.count > 0);
}
