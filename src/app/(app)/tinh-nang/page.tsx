import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { NAV_ICONS } from '@/components/shell/nav-icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { getNavBadges } from '@/lib/queries/badges';
import { visibleGroups } from '@/lib/nav';
import { getCurrentPermissions } from '@/lib/session';

// Lưới tính năng: mọi màn hình chia theo nhóm, có huy hiệu đếm từ DB. Mục không có quyền thì ẩn.
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
      <div className="h-9 w-40 animate-pulse rounded-xl bg-stone" />
      <div className="h-[320px] animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function FeaturesData() {
  await connection();
  const granted = new Set(await getCurrentPermissions());
  const counts = await getNavBadges(granted);
  const groups = visibleGroups(granted);

  return (
    <section className="flex flex-col">
      <PageHeader crumbs={['Trung tâm']} title="Tính năng" subtitle="Chạm vào một mục để mở màn hình. Số trên biểu tượng là việc đang chờ." />
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.id} aria-label={group.title}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{group.title}</h2>
            <div className="grid grid-cols-3 gap-3 min-[768px]:grid-cols-4 min-[1200px]:grid-cols-6">
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                const count = counts[item.href] ?? 0;
                return (
                  <Link key={item.href} href={item.href} className="relative flex min-w-0 flex-col items-center gap-2.5 rounded-[20px] border border-line bg-surface p-4 text-center shadow-card transition-colors hover:border-ink-2">
                    <span className="grid size-12 place-items-center rounded-[16px] bg-primary-soft text-ink">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="line-clamp-2 text-sm font-bold leading-tight text-ink">{item.label}</span>
                    {count > 0 && (
                      <span className="absolute right-2.5 top-2.5 min-w-6 rounded-full bg-primary-deep px-1.5 py-0.5 text-xs font-extrabold text-on-primary" aria-label={`${count} mục`}>
                        {count}
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
