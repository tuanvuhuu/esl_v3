import { Suspense } from 'react';
import { AccountsView, type TabKey } from '@/components/accounts/AccountsView';
import { NoAccess } from '@/components/ui/NoAccess';
import { listAccounts, listAuditLogs, getRoleMatrix, listTeacherOptions } from '@/lib/queries/accounts';
import { hasPermission, ROLE_CODES } from '@/lib/permissions';
import { listParam } from '@/lib/list-param';
import { getCurrentAccount, getCurrentPermissions } from '@/lib/session';
import { normalizeSearch } from '@/lib/text';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

const TABS: TabKey[] = ['nguoi-dung', 'phan-quyen', 'nhat-ky'];

export default function AccountsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountsData searchParams={searchParams} />
    </Suspense>
  );
}

function AccountsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải tài khoản" className="flex flex-col gap-4">
      <div className="h-9 w-56 animate-pulse rounded-xl bg-stone" />
      <div className="h-11 w-full animate-pulse rounded-[var(--radius-ctl)] bg-stone" />
      <div className="h-[360px] w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function AccountsData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tabRaw = first(sp.tab);
  const tab: TabKey = (TABS as string[]).includes(tabRaw) ? (tabRaw as TabKey) : 'nguoi-dung';
  const q = first(sp.q).slice(0, 80);
  // Vai trò và trạng thái chọn nhiều: danh sách rỗng nghĩa là không lọc
  const roles = listParam(sp.role).filter((r) => (ROLE_CODES as readonly string[]).includes(r));
  const statuses = listParam(sp.status).filter((s) => s === 'active' || s === 'locked');

  // Danh sách tài khoản, ma trận quyền và nhật ký chỉ xem được khi có quyền quản lý tài khoản
  const permitted = new Set(await getCurrentPermissions());
  if (!hasPermission(permitted, 'accounts.manage')) return <NoAccess title="Tài khoản & quyền" />;

  const [all, teachers, matrix, audit, granted, account] = await Promise.all([
    listAccounts(),
    listTeacherOptions(),
    getRoleMatrix(),
    listAuditLogs(100),
    getCurrentPermissions(),
    getCurrentAccount(),
  ]);

  const needle = normalizeSearch(q);
  const filtered = all.filter((a) => {
    if (roles.length && !roles.includes(a.role)) return false;
    if (statuses.length && !statuses.includes(a.status)) return false;
    if (!needle) return true;
    return normalizeSearch(`${a.fullName} ${a.email}`).includes(needle);
  });

  return (
    <AccountsView
      tab={tab}
      accounts={filtered}
      total={all.length}
      filters={{ q, role: roles.join(','), status: statuses.join(',') }}
      teachers={teachers}
      matrix={matrix}
      audit={audit}
      canManage={hasPermission(new Set(granted), 'accounts.manage')}
      isAdmin={account?.role === 'admin'}
    />
  );
}
