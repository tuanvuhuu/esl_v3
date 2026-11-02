import { CounterLabel } from '@primer/react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { NAV_ICONS } from '@/components/shell/nav-icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCampusContext } from '@/lib/campus-context';
import { visibleGroups } from '@/lib/nav';
import { getNavBadges } from '@/lib/queries/badges';
import { getCurrentPermissions } from '@/lib/session';

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
      <div className="h-9 w-40 animate-pulse rounded-lg bg-[var(--bgColor-muted)]" />
      <div className="h-[320px] animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />
    </section>
  );
}

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
        subtitle="Chạm vào một mục để mở màn hình. Số trên biểu tượng là việc đang chờ."
      />
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.id} aria-label={group.title}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">{group.title}</h2>
            <div className="grid grid-cols-3 gap-3 min-[768px]:grid-cols-4 min-[1200px]:grid-cols-6">
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                const count = counts[item.href] ?? 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-card="true"
                    className="relative flex min-w-0 flex-col items-center gap-2.5 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4 text-center shadow-[var(--shadow-resting-small,0_1px_2px_rgba(0,0,0,0.04))] transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-muted)]/60"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]">
                      <Icon size={20} aria-hidden />
                    </span>
                    <span className="line-clamp-2 text-sm font-semibold leading-tight text-[var(--fgColor-default)]">
                      {item.label}
                    </span>
                    {count > 0 && (
                      <span className="absolute right-2.5 top-2.5" aria-label={`${count} mục`}>
                        <CounterLabel className="!font-normal">{count}</CounterLabel>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
