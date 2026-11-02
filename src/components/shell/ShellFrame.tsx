'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { AppBackdrop } from '@/components/shell/AppBackdrop';
import type { CampusOption, CampusScope } from '@/lib/campus';
import type { NavGroup, NavItem } from '@/lib/nav';
import { AppBar } from './AppBar';
import { FeatureSheet } from './FeatureSheet';
import { MobileTabBar } from './MobileTabBar';
import { Sidebar } from './Sidebar';

type Props = {
  children: ReactNode;
  groups: NavGroup[];
  tabs: NavItem[];
  badges: Promise<Record<string, number>>;
  campuses: CampusOption[];
  campusScope: CampusScope;
  campusAllowAll: boolean;
  userName: string;
  userEmail: string;
  userRole: string;
  canSettings: boolean;
};

// Khung ứng dụng chính theo kiến trúc KhungUngDung.tsx (01. TSUKUBA): Sidebar 224px cố định từ 1200px, AppBar dính trên cùng, nội dung cuộn riêng.
export function ShellFrame({
  children,
  groups,
  tabs,
  badges,
  campuses,
  campusScope,
  campusAllowAll,
  userName,
  userEmail,
  userRole,
  canSettings,
}: Props) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [featOpen, setFeatOpen] = useState(false);
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
    <div className="grid min-h-screen min-[1200px]:grid-cols-[224px_minmax(0,1fr)]">
      <AppBackdrop />
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
        <main
          key={pathname}
          className="mx-auto w-full min-w-0 max-w-[1360px] flex-1 px-6 pb-4 pt-3 max-[1199px]:px-5 max-[1199px]:pb-4 max-[1199px]:pt-3 max-[767px]:px-4 max-[767px]:pb-[calc(116px+var(--safe-b))] max-[767px]:pt-4 min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:flex-col min-[1200px]:overflow-y-auto min-[1680px]:max-w-[1640px] min-[2240px]:max-w-[1920px]"
        >
          {children}
        </main>
      </div>

      <MobileTabBar tabs={tabs} onFeatures={() => setFeatOpen(true)} />
      <FeatureSheet open={featOpen} groups={groups} badges={badgeCounts} onClose={() => setFeatOpen(false)} />
    </div>
  );
}
