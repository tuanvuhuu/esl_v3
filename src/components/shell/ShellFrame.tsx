'use client';

// Khung ứng dụng chính đồng bộ KhungUngDung.tsx & AppLayout.module.css (01. TSUKUBA):
// - Thanh tiêu đề (AppBar) trải ngang 100% ở trên cùng.
// - Thân dưới chia 2 cột: Sidebar (244px) bên trái + Main (Breadcrumb đóng khung mục hiện tại + nội dung) bên phải.
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { AppBackdrop } from '@/components/shell/AppBackdrop';
import type { CampusOption, CampusScope } from '@/lib/campus';
import type { NavGroup, NavItem } from '@/lib/nav';
import { AppBar } from './AppBar';
import { FeatureSheet } from './FeatureSheet';
import { MobileTabBar } from './MobileTabBar';
import { useCrumbs } from './PageCrumbs';
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

function ShellBreadcrumbs() {
  const crumbs = useCrumbs();
  if (!crumbs || crumbs.length === 0) return null;
  return (
    <nav aria-label="Vị trí hiện tại" className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[13px] max-[767px]:hidden">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <Fragment key={`${i}-${c}`}>
            {i > 0 && (
              <span className="text-[var(--fgColor-muted)]" aria-hidden>
                /
              </span>
            )}
            {isLast ? (
              <span
                aria-current="page"
                className="inline-flex items-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-accent-emphasis)] bg-[var(--bgColor-default)] px-2.5 py-0.5 text-xs font-medium text-[var(--fgColor-default)]"
              >
                {c}
              </span>
            ) : (
              <span className="font-medium text-[var(--primary)]">{c}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

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
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr]">
      <AppBackdrop />

      <AppBar
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        canSettings={canSettings}
        campuses={campuses}
        campusScope={campusScope}
        campusAllowAll={campusAllowAll}
        onOpenMenu={() => setNavOpen((v) => !v)}
      />

      {navOpen && <div className="fixed inset-0 z-[55] bg-scrim min-[1200px]:hidden" onClick={() => setNavOpen(false)} aria-hidden />}

      <div className="grid min-h-0 min-[1200px]:grid-cols-[244px_minmax(0,1fr)]">
        <Sidebar groups={groups} badges={badgeCounts} open={navOpen} onNavigate={() => setNavOpen(false)} />

        <main
          key={pathname}
          className="tsukuba-page-enter w-full min-w-0 px-4 py-2 max-[767px]:px-3.5 max-[767px]:pb-[calc(112px+var(--safe-b))]"
        >
          <ShellBreadcrumbs />
          {children}
        </main>
      </div>

      <MobileTabBar tabs={tabs} onFeatures={() => setFeatOpen(true)} />
      <FeatureSheet open={featOpen} groups={groups} badges={badgeCounts} onClose={() => setFeatOpen(false)} />
    </div>
  );
}
