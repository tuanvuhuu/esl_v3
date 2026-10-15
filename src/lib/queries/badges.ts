// Huy hiệu đếm cho menu và bảng Tính năng: số việc đang chờ của từng màn, theo quyền. Chỉ chạy trên server.
import type { CampusScope } from '@/lib/campus';
import { todayKeyVN } from '@/lib/datetime';
import type { Permission } from '@/lib/permissions';
import { listOverdueAssignments } from './assignments';
import { getFeatureBadges } from './dashboard';
import { listInvoices } from './tuition';

// Khoá là đường dẫn menu, giá trị là số việc. Chỉ đếm dữ liệu của quyền đang có và của cơ sở đang xem.
export async function getNavBadges(granted: ReadonlySet<Permission>, scope: CampusScope): Promise<Record<string, number>> {
  const today = todayKeyVN();
  const [badges, overdue, invoices] = await Promise.all([
    getFeatureBadges(today, scope),
    granted.has('students.view') ? listOverdueAssignments(scope) : Promise.resolve([]),
    granted.has('tuition.manage') ? listInvoices(today, '', 'overdue', scope) : Promise.resolve(null),
  ]);
  return {
    ...badges,
    '/bai-tap': overdue.length,
    '/hoc-phi': invoices?.counts.overdue ?? 0,
  };
}
