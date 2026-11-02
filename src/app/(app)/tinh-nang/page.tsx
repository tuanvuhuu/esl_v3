import { ChevronRightIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { NAV_ICONS } from '@/components/shell/nav-icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill } from '@/components/ui/primitives';
import { getCampusContext } from '@/lib/campus-context';
import { visibleGroups } from '@/lib/nav';
import { getNavBadges } from '@/lib/queries/badges';
import { getCurrentPermissions } from '@/lib/session';

const GROUP_ACCENT: Record<string, { badgeBg: string; badgeText: string; hoverBorder: string }> = {
  main: {
    badgeBg: 'bg-[var(--primary-soft)]',
    badgeText: 'text-[var(--primary)]',
    hoverBorder: 'hover:border-l-[var(--primary)]',
  },
  finance: {
    badgeBg: 'bg-[#1baf7a]/12',
    badgeText: 'text-[#1baf7a]',
    hoverBorder: 'hover:border-l-[#1baf7a]',
  },
  system: {
    badgeBg: 'bg-[#2a78d6]/12',
    badgeText: 'text-[#2a78d6]',
    hoverBorder: 'hover:border-l-[#2a78d6]',
  },
};

export default function FeaturesPage() {
  return (
    <Suspense fallback={<FeaturesSkeleton />}>
      <FeaturesData />
    </Suspense>
  );
}

function FeaturesSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải tính năng" className="flex flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)]" />
      <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[960px]:grid-cols-3 min-[1280px]:grid-cols-4">
        <div className="h-20 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
        <div className="h-20 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
        <div className="h-20 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
        <div className="h-20 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
      </div>
    </section>
  );
}

// Bảng điều hướng Portal kiểu 01. TSUKUBA: phân nhóm theo phân hệ, huy hiệu Octicons, vạch nhấn bên trái khi rê chuột.
async function FeaturesData() {
  await connection();
  const granted = new Set(await getCurrentPermissions());
  const { scope } = await getCampusContext();
  const counts = await getNavBadges(granted, scope);
  const groups = visibleGroups(granted);

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Trung tâm']}
        title="Tính năng"
        subtitle="Chạm vào một phân hệ để mở màn hình làm việc. Nhãn số thể hiện công việc đang chờ xử lý."
      />

      <div className="tsukuba-rise flex flex-col gap-6">
        {groups.map((group) => {
          const palette = GROUP_ACCENT[group.id] ?? GROUP_ACCENT.main;
          return (
            <section
              key={group.id}
              aria-label={group.title}
              className="overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
            >
              <header className="flex items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-1 rounded-full bg-[var(--primary)]" aria-hidden />
                  <h2 className="m-0 text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-muted)]">
                    {group.title}
                  </h2>
                </div>
                <Pill tone="stone">{group.items.length} mục</Pill>
              </header>

              <div className="grid grid-cols-1 gap-3 p-4 min-[560px]:grid-cols-2 min-[960px]:grid-cols-3 min-[1280px]:grid-cols-4 max-[767px]:p-3.5">
                {group.items.map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  const count = counts[item.href] ?? 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-card="true"
                      className={`group relative flex min-w-0 items-center gap-3.5 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] border-l-transparent ${palette.hoverBorder} bg-[var(--bgColor-default)] px-3.5 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-muted)]/50`}
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-[var(--borderRadius-medium)] ${palette.badgeBg} ${palette.badgeText} transition-transform duration-150 group-hover:scale-105`}
                      >
                        <Icon size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">
                          {item.label}
                        </span>
                        <small className="block truncate font-mono text-[11px] text-[var(--fgColor-muted)]">
                          {item.href}
                        </small>
                      </div>
                      {count > 0 ? (
                        <span aria-label={`${count} mục`} className="shrink-0">
                          <Pill tone="blush">{count}</Pill>
                        </span>
                      ) : (
                        <ChevronRightIcon
                          size={15}
                          className="shrink-0 text-[var(--fgColor-muted)] opacity-50 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--primary)] group-hover:opacity-100"
                          aria-hidden
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
