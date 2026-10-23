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
  // Quyền và cơ sở không phụ thuộc nhau: lấy cùng lúc (DB ở xa, mỗi lượt đi về ~50ms)
  const [permissions, { campuses, scope, allowAll }] = await Promise.all([getCurrentPermissions(), getCampusContext()]);
  const granted = new Set(permissions);
  const tabs = MOBILE_TABS.filter((t) => t.permission === null || granted.has(t.permission));
  // Số việc chờ chỉ dùng trong bảng Tính năng (mặc định đóng): không chờ, để trang bắt đầu tải ngay; số hiện khi xong
  const badges = getNavBadges(granted, scope);

  return (
    <ShellFrame
      groups={visibleGroups(granted)}
      tabs={tabs}
      badges={badges}
      campuses={campuses}
      campusScope={scope}
      campusAllowAll={allowAll}
      userName={account.fullName}
      userEmail={account.email}
      userRole={account.roleLabel}
      canSettings={granted.has('settings.manage')}
    >
      {children}
    </ShellFrame>
  );
}
