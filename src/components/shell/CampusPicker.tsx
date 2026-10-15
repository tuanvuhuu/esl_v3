'use client';

// Chọn cơ sở đang xem, đặt trên thanh trên cùng. Lựa chọn lưu trong cookie và áp cho mọi màn hình.
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { setCampusAction } from '@/app/(app)/co-so/actions';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { CAMPUS_ALL, type CampusOption, type CampusScope } from '@/lib/campus';

export function CampusPicker({ campuses, scope }: { campuses: CampusOption[]; scope: CampusScope }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const serverValue = scope === null ? CAMPUS_ALL : String(scope);
  // Đổi ngay trên ô, không đợi máy chủ. Khi máy chủ xong thì giá trị theo props của trang.
  const [value, setOptimistic] = useOptimistic(serverValue);
  const options = [{ value: CAMPUS_ALL, label: 'Tất cả cơ sở' }, ...campuses.map((c) => ({ value: String(c.id), label: c.name }))];

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
      icon={<Building2 className="size-[18px] shrink-0" aria-hidden />}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
