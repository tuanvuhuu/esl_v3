import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ShellFrame } from '@/components/shell/ShellFrame';
import { getCampusContext } from '@/lib/campus-context';
import { MOBILE_TABS, visibleGroups } from '@/lib/nav';
import { getNavBadges } from '@/lib/queries/badges';
import { getCurrentAccount, getCurrentPermissions } from '@/lib/session';

// Mọi màn hình quản lý nằm trong khung này. Chưa đăng nhập thì chuyển về trang đăng nhập.
// Menu, tab bar và nút hiện theo quyền của tài khoản (task 9.2).
// Đọc cookie và DB nằm trong Suspense (cacheComponents đang bật, docs: E-025).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  await connection();
  const account = await getCurrentAccount();
  if (!account) redirect('/dang-nhap');
  // Học sinh chỉ dùng khu học sinh (P28), không vào màn quản lý
  if (account.role === 'student') redirect('/cua-toi');
  const granted = new Set(await getCurrentPermissions());
  const tabs = MOBILE_TABS.filter((t) => t.permission === null || granted.has(t.permission));
  const { campuses, scope } = await getCampusContext();
  const badges = await getNavBadges(granted, scope);

  return (
    <ShellFrame
      groups={visibleGroups(granted)}
      tabs={tabs}
      badges={badges}
      campuses={campuses}
      campusScope={scope}
      userName={account.fullName}
      userEmail={account.email}
      userRole={account.roleLabel}
      canSettings={granted.has('settings.manage')}
    >
      {children}
    </ShellFrame>
  );
}
