'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cleanupOrphanFilesAction } from '@/app/(app)/cai-dat/file-actions';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast, useToast } from '@/components/ui/Toast';
import { Alert } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';

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
    <Panel title="Tệp không còn dùng" className="flex flex-col gap-3">
        <p className="text-sm text-ink-2">
          Tệp tải lên đã quá 24 giờ mà không còn câu hỏi, bài nộp hay tài liệu nào dùng. Tệp mới dưới 24 giờ được giữ lại.
        </p>
      <p className="text-base text-ink">
        {count === 0 ? 'Không có tệp nào cần dọn.' : `Có ${count} tệp, khoảng ${megabytes} MB.`}
      </p>
      {error && (
        <Alert inline>
          {error}
        </Alert>
      )}
      <div>
        <Btn variant="ghost" onClick={() => setAsking(true)} disabled={!canManage || count === 0 || pending}>
          {pending ? 'Đang dọn…' : 'Dọn tệp không còn dùng'}
        </Btn>
      </div>

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
    </Panel>
  );
}
