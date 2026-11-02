'use client';

import { ArchiveIcon, TrashIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cleanupOrphanFilesAction } from '@/app/(app)/cai-dat/file-actions';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Pill } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';

// Dọn tệp tải lên không còn dùng (P29). Việc xoá cần xác nhận vì không hoàn tác.
export function FileCleanup({ count, megabytes, canManage }: { count: number; megabytes: string; canManage: boolean }) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    startTransition(async () => {
      const r = await cleanupOrphanFilesAction();
      setAsking(false);
      if (!r.ok) return setError(r.message ?? 'Không dọn được tệp');
      setError(null);
      notify(r.message ?? 'Đã dọn tệp');
      router.refresh();
    });
  }

  return (
    <Panel
      title="Tệp không còn dùng"
      action={<Pill tone={count > 0 ? 'butter' : 'mint'}>{count > 0 ? `${count} tệp chờ dọn` : 'Sạch'}</Pill>}
      className="tsukuba-rise"
    >
      <div className="flex flex-col gap-3.5">
        <p className="m-0 text-sm leading-relaxed text-[var(--fgColor-muted)]">
          Tệp tải lên đã quá 24 giờ mà không còn câu hỏi, bài nộp hay tài liệu nào tham chiếu. Tệp mới dưới 24 giờ luôn được giữ lại an toàn.
        </p>

        <div
          className={`flex items-center justify-between gap-3 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] border-l-[3px] ${
            count > 0 ? 'border-l-[#eb6834]' : 'border-l-[#1baf7a]'
          } bg-[var(--bgColor-muted)]/60 px-3.5 py-2.5`}
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)]">
              <ArchiveIcon size={15} aria-hidden />
            </span>
            <span className="text-sm font-medium tabular-nums text-[var(--fgColor-default)]">
              {count === 0 ? 'Không có tệp nào cần dọn.' : `Có ${count} tệp, khoảng ${megabytes} MB.`}
            </span>
          </div>
          <Btn
            variant="ghost"
            leadingVisual={pending ? undefined : TrashIcon}
            loading={pending}
            onClick={() => setAsking(true)}
            disabled={!canManage || count === 0 || pending}
          >
            {pending ? 'Đang dọn…' : 'Dọn tệp không còn dùng'}
          </Btn>
        </div>

        {error && <Alert inline>{error}</Alert>}

        <ConfirmDialog
          open={asking}
          title="Dọn tệp không còn dùng?"
          text={`${count} tệp sẽ bị xoá khỏi ổ đĩa và không thể khôi phục. Các câu hỏi và bài làm đang dùng tệp không bị ảnh hưởng.`}
          confirmLabel="Dọn tệp"
          pending={pending}
          onConfirm={run}
          onCancel={() => setAsking(false)}
        />

        <Toast message={message} />
      </div>
    </Panel>
  );
}
