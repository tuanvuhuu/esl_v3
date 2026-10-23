'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { CampusOption, CampusScope } from '@/lib/campus';
import type { NavGroup, NavItem } from '@/lib/nav';
import { AppBar } from './AppBar';
import { FeatureSheet } from './FeatureSheet';
import { MobileTabBar } from './MobileTabBar';
import { Sidebar } from './Sidebar';

type Props = {
  children: ReactNode;
  groups: NavGroup[]; // đã lọc theo quyền
  tabs: NavItem[]; // tab bar điện thoại, đã lọc theo quyền
  badges: Promise<Record<string, number>>; // số việc chờ của từng màn, cho bảng Tính năng (tải sau, không chặn trang)
  campuses: CampusOption[]; // các cơ sở, cho bộ chọn trên thanh trên cùng
  campusScope: CampusScope; // cơ sở đang xem (null: tất cả)
  campusAllowAll: boolean; // tài khoản làm việc ở mọi cơ sở thì có lựa chọn Tất cả cơ sở
  userName: string;
  userEmail: string;
  userRole: string;
  canSettings: boolean;
};

// Khung ứng dụng: thanh bên (web), ngăn kéo (máy tính bảng), thanh trên cùng, tab bar và bảng Tính năng (điện thoại)
export function ShellFrame({ children, groups, tabs, badges, campuses, campusScope, campusAllowAll, userName, userEmail, userRole, canSettings }: Props) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [featOpen, setFeatOpen] = useState(false);
  // Số việc chờ đến sau (máy chủ không chờ tính xong mới gửi trang): một bảng Tính năng duy nhất, số điền vào khi có
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    badges.then((b) => {
      if (alive) setBadgeCounts(b);
    });
    return () => {
      alive = false;
    };
  }, [badges]);

  // Esc đóng ngăn kéo menu hoặc bảng Tính năng
  useEffect(() => {
    if (!navOpen && !featOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setNavOpen(false);
      setFeatOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen, featOpen]);

  return (
    <div className="grid min-h-screen min-[1200px]:grid-cols-[208px_minmax(0,1fr)]">
      <Sidebar groups={groups} open={navOpen} onNavigate={() => setNavOpen(false)} />

      {navOpen && <div className="fixed inset-0 z-[55] bg-scrim" onClick={() => setNavOpen(false)} aria-hidden />}

      <div className="flex min-w-0 flex-col min-[1200px]:h-screen">
        <AppBar
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          canSettings={canSettings}
          campuses={campuses}
          campusScope={campusScope}
          campusAllowAll={campusAllowAll}
          onOpenMenu={() => setNavOpen(true)}
        />
        {/* Máy tính (từ 1200px): nội dung cuộn trong khung này, thanh trên và menu đứng yên. Đổi trang thì về đầu khung (key theo đường dẫn). */}
        <main
          key={pathname}
          className="mx-auto w-full min-w-0 max-w-[1360px] flex-1 min-[1680px]:max-w-[1640px] min-[2240px]:max-w-[1920px] px-6 pb-4 pt-3 max-[1199px]:px-5 max-[1199px]:pb-4 max-[1199px]:pt-3 max-[767px]:px-4 max-[767px]:pb-[calc(116px+var(--safe-b))] max-[767px]:pt-4 min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:flex-col min-[1200px]:overflow-y-auto"
        >
          {children}
        </main>
      </div>

      <MobileTabBar tabs={tabs} onFeatures={() => setFeatOpen(true)} />
      <FeatureSheet open={featOpen} groups={groups} badges={badgeCounts} onClose={() => setFeatOpen(false)} />
    </div>
  );
}
