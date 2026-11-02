'use client';

import { ArrowLeftIcon, MegaphoneIcon, PaperAirplaneIcon } from '@primer/octicons-react';
import { ActionList, CounterLabel, Label, LinkButton } from '@primer/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createMyLinkAction, replyToParentAction } from '@/app/(app)/tin-nhan/actions';
import type { Conversation, ThreadMessage } from '@/lib/telegram/service';
import { Btn } from '@/components/ui/Btn';
import { Field, textareaClass } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/primitives';
import { EmptyPanel, Notice, Panel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
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
      action={<Label variant={linked ? 'success' : 'secondary'}>{linked ? 'Đã kết nối' : 'Chưa kết nối'}</Label>}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--fgColor-muted)]">
          {linked
            ? 'Đã kết nối. Bạn nhận thông báo của hệ thống qua bot Telegram.'
            : 'Kết nối Telegram để nhận thông báo, ví dụ khi học sinh nộp bài.'}
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

// Hộp tin với phụ huynh dùng ActionList + CounterLabel + LinkButton của @primer/react v38.
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
      <div className="flex flex-col gap-3">
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
    <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-[minmax(280px,360px)_1fr]">
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
        <ActionList aria-label="Cuộc trò chuyện" showDividers>
          {conversations.map((c) => {
            const active = selected?.parentId === c.parentId;
            return (
              <ActionList.LinkItem
                key={c.parentId}
                as={Link}
                href={`/tin-nhan?p=${c.parentId}`}
                active={active}
                aria-current={active ? 'true' : undefined}
              >
                <ActionList.LeadingVisual>
                  <Avatar name={c.parentName} seed={c.parentId} />
                </ActionList.LeadingVisual>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-[var(--fgColor-default)]">{c.parentName}</span>
                  <span className="shrink-0 text-xs font-normal text-[var(--fgColor-muted)]">{timeLabel(c.lastAt)}</span>
                </div>
                <ActionList.Description variant="block">
                  <span className="block truncate">
                    {c.lastDirection === 'out' ? 'Trung tâm: ' : ''}
                    {c.lastText}
                  </span>
                </ActionList.Description>
                {c.unread > 0 && (
                  <ActionList.TrailingVisual>
                    <CounterLabel scheme="primary">{c.unread} mới</CounterLabel>
                  </ActionList.TrailingVisual>
                )}
              </ActionList.LinkItem>
            );
          })}
        </ActionList>
      </Panel>

      {selected ? (
        <Panel
          title={selected.parentName}
          action={
            <div className="flex items-center gap-2">
              <Label variant={selected.linked ? 'success' : 'secondary'}>
                {selected.linked ? 'Đang kết nối Telegram' : 'Chưa kết nối'}
              </Label>
              <LinkButton as={Link} href="/tin-nhan" leadingVisual={ArrowLeftIcon} className="min-[1024px]:!hidden">
                Tất cả
              </LinkButton>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[var(--fgColor-muted)]">Số điện thoại: {selected.phone}</p>
            <ol
              aria-label="Tin nhắn"
              className="flex max-h-[56dvh] flex-col gap-2 overflow-y-auto rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-3"
            >
              {thread.map((m) => (
                <li
                  key={m.id}
                  className={`flex max-w-[85%] flex-col gap-0.5 rounded-[var(--borderRadius-medium)] border px-3 py-2 ${
                    m.direction === 'out'
                      ? 'self-end border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-default)]'
                      : 'self-start border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)]'
                  }`}
                >
                  <span className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{m.text}</span>
                  <span className="text-xs text-[var(--fgColor-muted)]">
                    {timeLabel(m.createdAt)}
                    {m.direction === 'out' && m.senderName ? ` · ${m.senderName}` : ''}
                    {m.direction === 'out' && !m.delivered ? ' · chưa gửi được' : ''}
                  </span>
                </li>
              ))}
            </ol>
            {selected.linked ? (
              <div className="flex flex-col gap-2">
                <Field label="Trả lời" error={error ?? undefined}>
                  <textarea
                    name="text"
                    rows={3}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={2000}
                    className={textareaClass(error ?? undefined)}
                  />
                </Field>
                <div className="flex justify-end">
                  <Btn
                    variant="primary"
                    leadingVisual={pending ? undefined : PaperAirplaneIcon}
                    loading={pending}
                    onClick={send}
                    disabled={pending || text.trim() === ''}
                    className="max-[767px]:w-full"
                  >
                    {pending ? 'Đang gửi…' : 'Gửi qua Telegram'}
                  </Btn>
                </div>
              </div>
            ) : (
              <Notice>Phụ huynh chưa kết nối hoặc đã gõ /huy. Tạo link kết nối mới ở màn Phụ huynh để nhắn lại.</Notice>
            )}
          </div>
        </Panel>
      ) : (
        <div className="max-[1023px]:hidden">
          <EmptyPanel title="Chọn một cuộc trò chuyện" hint="Bấm vào một phụ huynh ở danh sách bên trái để xem và trả lời tin nhắn." />
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
