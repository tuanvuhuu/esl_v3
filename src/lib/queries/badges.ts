// Huy hiệu đếm cho menu và bảng Tính năng: số việc đang chờ của từng màn, theo quyền. Chỉ chạy trên server.
import { todayKeyVN } from '@/lib/datetime';
import type { Permission } from '@/lib/permissions';
import { listOverdueAssignments } from './assignments';
import { getFeatureBadges } from './dashboard';
import { listInvoices } from './tuition';

// Khoá là đường dẫn menu, giá trị là số việc. Chỉ đếm dữ liệu của quyền đang có.
export async function getNavBadges(granted: ReadonlySet<Permission>): Promise<Record<string, number>> {
  const today = todayKeyVN();
  const [badges, overdue, invoices] = await Promise.all([
    getFeatureBadges(today),
    granted.has('students.view') ? listOverdueAssignments() : Promise.resolve([]),
    granted.has('tuition.manage') ? listInvoices(today, '', 'overdue') : Promise.resolve(null),
  ]);
  return {
    ...badges,
    '/bai-tap': overdue.length,
    '/hoc-phi': invoices?.counts.overdue ?? 0,
  };
}
