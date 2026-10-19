'use client';

import { Copy, Send } from 'lucide-react';
import { useState, useTransition } from 'react';
import type { LinkResult } from '@/app/(app)/tin-nhan/actions';
import { Btn } from '@/components/ui/Btn';
import { FormFooter } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';

// Hộp thoại tạo link kết nối Telegram. Dùng cho phụ huynh (màn Phụ huynh) và cho chính nhân viên (màn Tin nhắn).
export function TelegramLinkDialog({
  open,
  title,
  subtitle,
  linked,
  create,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  linked: boolean;
  create: () => Promise<LinkResult>;
  onClose: () => void;
}) {
  const [result, setResult] = useState<LinkResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function close() {
    setResult(null);
    setCopied(false);
    onClose();
  }

  function run() {
    setCopied(false);
    startTransition(async () => setResult(await create()));
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const ok = result && result.ok ? result : null;
  const shareText = ok ? (ok.link ?? `/start ${ok.code}`) : '';

  return (
    <Modal open={open} title={title} subtitle={subtitle} onClose={close} labelledBy="telegram-link-title">
      <div className="flex flex-col gap-3">
        {linked && <Notice>Đã kết nối Telegram. Tạo link mới nếu muốn kết nối thêm một máy hoặc tài khoản Telegram khác.</Notice>}
        {result && !result.ok && <Alert>{result.message}</Alert>}
        {ok ? (
          <>
            <p className="text-base text-ink-2">Gửi link này qua Zalo, SMS hoặc email. Người nhận mở link, bấm Start trong Telegram là kết nối xong.</p>
            <code aria-label="Link kết nối Telegram" className="block break-all rounded-[var(--radius-ctl)] bg-stone px-3 py-2.5 text-sm text-ink">
              {shareText}
            </code>
            <p className="text-sm text-muted">
              Mã kết nối: <span aria-label="Mã kết nối">{ok.code}</span>. {ok.message}
            </p>
          </>
        ) : (
          <p className="text-base text-ink-2">Bấm Tạo link để lấy link kết nối dùng một lần, hết hạn sau 7 ngày.</p>
        )}
        <FormFooter>
          <Btn onClick={close}>Đóng</Btn>
          {ok ? (
            <Btn variant="primary" onClick={() => copy(shareText)}>
              <Copy className="size-4" aria-hidden />
              {copied ? 'Đã chép' : 'Chép link'}
            </Btn>
          ) : (
            <Btn variant="primary" onClick={run} disabled={pending}>
              <Send className="size-4" aria-hidden />
              {pending ? 'Đang tạo…' : 'Tạo link'}
            </Btn>
          )}
        </FormFooter>
      </div>
    </Modal>
  );
}
