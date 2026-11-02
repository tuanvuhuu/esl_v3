'use client';

import { CheckIcon, CopyIcon, PaperAirplaneIcon } from '@primer/octicons-react';
import { useState, useTransition } from 'react';
import type { LinkResult } from '@/app/(app)/tin-nhan/actions';
import { Btn } from '@/components/ui/Btn';
import { FormFooter, FormSection } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert, Pill } from '@/components/ui/primitives';
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
    <Modal open={open} size="md" title={title} subtitle={subtitle} onClose={close} labelledBy="telegram-link-title">
      <div className="flex flex-col gap-3.5 pb-1">
        {linked && (
          <Notice>Đã kết nối Telegram. Tạo link mới nếu muốn kết nối thêm một máy hoặc tài khoản Telegram khác.</Notice>
        )}
        {result && !result.ok && <Alert>{result.message}</Alert>}

        <FormSection
          title={ok ? 'Liên kết một lần' : 'Khởi tạo mã kết nối'}
          action={ok ? <Pill tone="mint">Hiệu lực 7 ngày</Pill> : <Pill tone="stone">Dùng 1 lần</Pill>}
          grid={false}
        >
          {ok ? (
            <div className="flex flex-col gap-2.5">
              <p className="m-0 text-xs leading-relaxed text-[var(--fgColor-muted)]">
                Gửi đường dẫn dưới đây qua Zalo, SMS hoặc email. Người nhận mở link và bấm <b>Start</b> trong Telegram là hoàn tất.
              </p>
              <code
                aria-label="Link kết nối Telegram"
                className="block break-all rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-3 py-2.5 font-mono text-xs text-[var(--fgColor-default)]"
              >
                {shareText}
              </code>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-dashed border-[var(--borderColor-muted)] pt-2 text-xs text-[var(--fgColor-muted)]">
                <span>
                  Mã kết nối:{' '}
                  <span
                    aria-label="Mã kết nối"
                    className="rounded bg-[var(--bgColor-neutral-muted)] px-1.5 py-0.5 font-mono font-medium text-[var(--fgColor-default)]"
                  >
                    {ok.code}
                  </span>
                </span>
                {ok.message && <span>{ok.message}</span>}
              </div>
            </div>
          ) : (
            <p className="m-0 text-sm leading-relaxed text-[var(--fgColor-muted)]">
              Bấm <b>Tạo link</b> để sinh mã liên kết dùng một lần, tự động hết hạn sau 7 ngày nếu chưa kích hoạt.
            </p>
          )}
        </FormSection>

        <FormFooter>
          <Btn onClick={close}>Đóng</Btn>
          {ok ? (
            <Btn variant="primary" leadingVisual={copied ? CheckIcon : CopyIcon} onClick={() => copy(shareText)}>
              {copied ? 'Đã chép' : 'Chép link'}
            </Btn>
          ) : (
            <Btn variant="primary" leadingVisual={PaperAirplaneIcon} loading={pending} onClick={run} disabled={pending}>
              {pending ? 'Đang tạo…' : 'Tạo link'}
            </Btn>
          )}
        </FormFooter>
      </div>
    </Modal>
  );
}
