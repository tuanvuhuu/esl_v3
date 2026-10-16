import { Suspense } from 'react';
import { ImportView } from '@/components/import/ImportView';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { hasPermission } from '@/lib/permissions';
import { getCurrentPermissions } from '@/lib/session';

// Nhập cơ sở, lớp, giáo viên, học sinh và phụ huynh từ một file Excel. Quyền đọc trong Suspense (cacheComponents đang bật).
export default function ImportPage() {
  return (
    <Suspense fallback={<section aria-busy="true" aria-label="Đang tải" className="h-[320px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />}>
      <ImportData />
    </Suspense>
  );
}

async function ImportData() {
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'settings.manage')) return <NoAccess title="Nhập dữ liệu" />;
  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Hệ thống', 'Nhập dữ liệu']}
        title="Nhập dữ liệu"
        subtitle="Nhập cơ sở, lớp, giáo viên, học sinh và phụ huynh từ file Excel. Xem trước từng dòng rồi mới ghi."
      />
      <ImportView />
    </section>
  );
}
