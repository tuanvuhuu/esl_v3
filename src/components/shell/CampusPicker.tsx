'use client';

// Chọn cơ sở đang xem trên thanh tiêu đề (dùng OrganizationIcon của @primer/octicons-react).
import { OrganizationIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { setCampusAction } from '@/app/(app)/co-so/actions';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { CAMPUS_ALL, type CampusOption, type CampusScope } from '@/lib/campus';

export function CampusPicker({
  campuses,
  scope,
  allowAll = true,
}: {
  campuses: CampusOption[];
  scope: CampusScope;
  allowAll?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const serverValue = scope === null ? CAMPUS_ALL : String(scope);
  const [value, setOptimistic] = useOptimistic(serverValue);
  const options = [
    ...(allowAll ? [{ value: CAMPUS_ALL, label: 'Tất cả cơ sở' }] : []),
    ...campuses.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  function onChange(next: string) {
    startTransition(async () => {
      setOptimistic(next);
      await setCampusAction(next);
      router.refresh();
    });
  }

  return (
    <SelectPanel
      variant="bar"
      label="Cơ sở"
      icon={<OrganizationIcon size={16} className="shrink-0" aria-hidden />}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
