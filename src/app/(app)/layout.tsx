import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ShellFrame } from '@/components/shell/ShellFrame';
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
  const granted = new Set(await getCurrentPermissions());
  const tabs = MOBILE_TABS.filter((t) => t.permission === null || granted.has(t.permission));
  const badges = await getNavBadges(granted);

  return (
    <ShellFrame
      groups={visibleGroups(granted)}
      tabs={tabs}
      badges={badges}
      userName={account.fullName}
      userEmail={account.email}
      userRole={account.roleLabel}
      canSettings={granted.has('settings.manage')}
    >
      {children}
    </ShellFrame>
  );
}
