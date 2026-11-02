'use client';

import { ArrowLeftIcon, MegaphoneIcon, PaperAirplaneIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createMyLinkAction, replyToParentAction } from '@/app/(app)/tin-nhan/actions';
import { TextAreaAutoHeight } from '@/components-ui';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { Avatar, Pill } from '@/components/ui/primitives';
import { EmptyPanel, Notice, Panel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import type { Conversation, ThreadMessage } from '@/lib/telegram/service';
import { BroadcastDialog } from './BroadcastDialog';
import { TelegramLinkDialog } from './TelegramLinkDialog';

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Kết nối Telegram của chính nhân viên, để nhận thông báo (bài nộp mới...)
export function MyTelegramPanel({ linked }: { linked: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Panel
      title="Telegram của bạn"
      action={<Pill tone={linked ? 'mint' : 'stone'}>{linked ? 'Đã kết nối' : 'Chưa kết nối'}</Pill>}
      className="tsukuba-rise"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-[var(--fgColor-muted)]">
          {linked
            ? 'Đã kết nối. Bạn nhận thông báo công việc (đơn xin nghỉ, bài nộp mới...) trực tiếp qua bot Telegram.'
            : 'Kết nối tài khoản Telegram cá nhân để nhận thông báo ngay khi học sinh nộp bài hoặc phụ huynh gửi đơn nghỉ.'}
        </p>
        <Btn onClick={() => setOpen(true)}>{linked ? 'Kết nối thêm máy' : 'Kết nối Telegram'}</Btn>
      </div>
      <TelegramLinkDialog
        open={open}
        title="Kết nối Telegram của bạn"
        subtitle="Mở link trên điện thoại có Telegram rồi bấm Start."
        linked={linked}
        create={createMyLinkAction}
        onClose={() => setOpen(false)}
      />
    </Panel>
  );
}

// Hộp tin 2 ngăn chuẩn 01. TSUKUBA: danh sách hội thoại có vạch nhấn vermilion bên trái + luồng bong bóng tin nhắn + chân soạn thảo #f7f8fa.
export function TelegramInbox({
  conversations,
  selected,
  thread,
  canManage = false,
  canBroadcastAll = false,
  broadcastCampuses = [],
  broadcastClasses = [],
}: {
  conversations: Conversation[];
  selected: Conversation | null;
  thread: ThreadMessage[];
  canManage?: boolean;
  canBroadcastAll?: boolean;
  broadcastCampuses?: { id: number; name: string }[];
  broadcastClasses?: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { message, notify } = useToast();

  function send() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const r = await replyToParentAction(selected.parentId, text);
      if (!r.ok) {
        setError(r.message ?? 'Không gửi được');
        return;
      }
      setText('');
      notify(r.message ?? 'Đã gửi');
      router.refresh();
    });
  }

  if (conversations.length === 0) {
    return (
      <div className="tsukuba-rise flex flex-col gap-3">
        <EmptyPanel
          title="Chưa có tin nhắn nào"
          hint="Tạo link kết nối Telegram cho phụ huynh ở màn Phụ huynh (nút ⋯ → Kết nối Telegram). Phụ huynh nhắn bot thì tin hiện ở đây."
          action={
            canManage ? (
              <Btn variant="primary" leadingVisual={MegaphoneIcon} onClick={() => setBroadcastOpen(true)}>
                Gửi thông báo chung
              </Btn>
            ) : undefined
          }
        />
        <BroadcastDialog
          open={broadcastOpen}
          canBroadcastAll={canBroadcastAll}
          campuses={broadcastCampuses}
          classes={broadcastClasses}
          onClose={() => setBroadcastOpen(false)}
          onSuccess={(msg) => {
            notify(msg);
            router.refresh();
          }}
        />
        <Toast message={message} />
      </div>
    );
  }

  return (
    <div className="tsukuba-rise grid grid-cols-1 gap-4 min-[1024px]:grid-cols-[minmax(300px,360px)_1fr] min-[1024px]:items-start">
      <Panel
        title="Cuộc trò chuyện"
        padded={false}
        className={selected ? 'max-[1023px]:hidden' : ''}
        action={
          canManage ? (
            <Btn leadingVisual={MegaphoneIcon} onClick={() => setBroadcastOpen(true)}>
              Thông báo chung
            </Btn>
          ) : undefined
        }
      >
        <ul
          aria-label="Cuộc trò chuyện"
          className="m-0 flex max-h-[68dvh] list-none flex-col divide-y divide-[var(--borderColor-muted)] overflow-y-auto p-0 scroll-quiet"
        >
          {conversations.map((c) => {
            const active = selected?.parentId === c.parentId;
            return (
              <li key={c.parentId}>
                <Link
                  href={`/tin-nhan?p=${c.parentId}`}
                  data-card="true"
                  aria-current={active ? 'true' : undefined}
                  className={`flex items-start gap-3 px-3.5 py-3 transition-colors ${
                    active
                      ? 'bg-[var(--primary-soft)]/55 shadow-[inset_3px_0_0_var(--primary)]'
                      : 'bg-[var(--bgColor-default)] hover:bg-[var(--bgColor-muted)]/75'
                  }`}
                >
                  <Avatar name={c.parentName} seed={c.parentId} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm ${
                          active || c.unread > 0 ? 'font-semibold text-[var(--fgColor-default)]' : 'font-medium text-[var(--fgColor-default)]'
                        }`}
                      >
                        {c.parentName}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--fgColor-muted)]">
                        {timeLabel(c.lastAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="block min-w-0 truncate text-xs text-[var(--fgColor-muted)]">
                        {c.lastDirection === 'out' ? 'Trung tâm: ' : ''}
                        {c.lastText}
                      </span>
                      {c.unread > 0 && <Pill tone="blush">{c.unread} mới</Pill>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>

      {selected ? (
        <Panel
          title={selected.parentName}
          padded={false}
          action={
            <div className="flex items-center gap-2">
              <Pill tone={selected.linked ? 'mint' : 'stone'}>
                {selected.linked ? 'Đang kết nối Telegram' : 'Chưa kết nối'}
              </Pill>
              <Link href="/tin-nhan" className={`${BTN_BASE} ${BTN_GHOST} min-[1024px]:!hidden`}>
                <ArrowLeftIcon size={14} aria-hidden />
                <span>Tất cả</span>
              </Link>
            </div>
          }
        >
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] px-4 py-2 text-xs text-[var(--fgColor-muted)]">
              <span>
                Số điện thoại:{' '}
                <code className="rounded bg-[var(--bgColor-neutral-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--fgColor-default)]">
                  {selected.phone}
                </code>
              </span>
              <span className="tabular-nums">{thread.length} tin nhắn</span>
            </div>

            <ol
              aria-label="Tin nhắn"
              className="m-0 flex max-h-[52dvh] min-h-[260px] list-none flex-col gap-2.5 overflow-y-auto bg-[var(--bgColor-inset)] p-4 scroll-quiet"
            >
              {thread.map((m) => (
                <li
                  key={m.id}
                  className={`flex max-w-[84%] flex-col gap-1 px-3.5 py-2.5 ${
                    m.direction === 'out'
                      ? 'self-end rounded-2xl rounded-br-[4px] border border-[var(--primary)]/25 bg-[var(--primary-soft)]/70 text-[var(--fgColor-default)]'
                      : 'self-start rounded-2xl rounded-bl-[4px] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] shadow-[0_1px_2px_rgba(31,35,40,0.04)]'
                  }`}
                >
                  <span className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{m.text}</span>
                  <span className="text-[11px] tabular-nums text-[var(--fgColor-muted)]">
                    {timeLabel(m.createdAt)}
                    {m.direction === 'out' && m.senderName ? ` · ${m.senderName}` : ''}
                    {m.direction === 'out' && !m.delivered ? (
                      <span className="font-medium text-[var(--fgColor-attention)]"> · chưa gửi được</span>
                    ) : (
                      ''
                    )}
                  </span>
                </li>
              ))}
            </ol>

            <div className="border-t border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-4 py-3 max-[767px]:px-3.5">
              {selected.linked ? (
                <div className="flex flex-col gap-2.5">
                  <Field label="Trả lời" error={error ?? undefined}>
                    <TextAreaAutoHeight
                      name="text"
                      aria-label="Trả lời"
                      rows={2}
                      placeholder="Nhập tin nhắn phản hồi phụ huynh qua Telegram…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={2000}
                      error={Boolean(error)}
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-2">
                    <small className="text-xs tabular-nums text-[var(--fgColor-muted)] max-[639px]:hidden">
                      {text.length}/2000 ký tự
                    </small>
                    <Btn
                      variant="primary"
                      leadingVisual={pending ? undefined : PaperAirplaneIcon}
                      loading={pending}
                      onClick={send}
                      disabled={pending || text.trim() === ''}
                      className="ml-auto max-[767px]:w-full"
                    >
                      {pending ? 'Đang gửi…' : 'Gửi qua Telegram'}
                    </Btn>
                  </div>
                </div>
              ) : (
                <Notice>Phụ huynh chưa kết nối hoặc đã gõ /huy. Tạo link kết nối mới ở màn Phụ huynh để nhắn lại.</Notice>
              )}
            </div>
          </div>
        </Panel>
      ) : (
        <div className="max-[1023px]:hidden">
          <EmptyPanel
            title="Chọn một cuộc trò chuyện"
            hint="Bấm vào một phụ huynh ở danh sách bên trái để xem toàn bộ lịch sử trao đổi và trả lời ngay."
          />
        </div>
      )}

      <BroadcastDialog
        open={broadcastOpen}
        canBroadcastAll={canBroadcastAll}
        campuses={broadcastCampuses}
        classes={broadcastClasses}
        onClose={() => setBroadcastOpen(false)}
        onSuccess={(msg) => {
          notify(msg);
          router.refresh();
        }}
      />
      <Toast message={message} />
    </div>
  );
}
