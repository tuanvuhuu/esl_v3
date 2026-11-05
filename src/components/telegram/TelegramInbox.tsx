'use client';

import { ArrowLeftIcon, DeviceMobileIcon, MegaphoneIcon, PaperAirplaneIcon, SearchIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { createMyLinkAction, replyToParentAction } from '@/app/(app)/tin-nhan/actions';
import { TextAreaAutoHeight, TextInput } from '@/components-ui';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { Field } from '@/components/ui/Field';
import { Avatar, Pill } from '@/components/ui/primitives';
import { EmptyPanel, Notice, Panel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { normalizeSearch } from '@/lib/text';
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

// Thanh trạng thái kết nối Telegram cá nhân gọn 1 dòng chuẩn CRM
export function MyTelegramPanel({ linked }: { linked: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-label="Telegram của bạn"
      className="tsukuba-rise flex flex-wrap items-center justify-between gap-3 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] border-l-[#0ea5e9] bg-[var(--bgColor-default)] px-4 py-2.5 shadow-[var(--shadow)] max-[767px]:px-3.5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-[var(--borderRadius-medium)] border border-[#bae6fd] bg-[#f0f9ff] text-[#0284c7] dark:border-[#075985] dark:bg-[#082f49] dark:text-[#38bdf8]"
        >
          <PaperAirplaneIcon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm font-semibold text-[var(--fgColor-default)]">Telegram của bạn</b>
            <Pill tone={linked ? 'mint' : 'stone'}>{linked ? 'Đã kết nối' : 'Chưa kết nối'}</Pill>
          </div>
          <p className="m-0 truncate text-xs text-[var(--fgColor-muted)] max-[639px]:whitespace-normal">
            {linked
              ? 'Nhận thông báo đơn xin nghỉ và bài nộp mới trực tiếp qua bot Telegram.'
              : 'Kết nối tài khoản Telegram cá nhân để nhận thông báo ngay khi học sinh nộp bài hoặc phụ huynh gửi đơn nghỉ.'}
          </p>
        </div>
      </div>
      <Btn variant={linked ? 'ghost' : 'primary'} leadingVisual={PaperAirplaneIcon} onClick={() => setOpen(true)}>
        {linked ? 'Kết nối thêm máy' : 'Kết nối Telegram'}
      </Btn>
      <TelegramLinkDialog
        open={open}
        title="Kết nối Telegram của bạn"
        subtitle="Mở link trên điện thoại có Telegram rồi bấm Start."
        linked={linked}
        create={createMyLinkAction}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}

// Hộp tin 2 ngăn chuẩn 01. TSUKUBA: danh sách hội thoại trắng tinh có vạch nhấn bên trái + luồng bong bóng tin nhắn #f8fafc + chân soạn thảo trắng.
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
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [error, setError] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { message, notify } = useToast();

  const unreadTotal = useMemo(() => conversations.filter((c) => c.unread > 0).length, [conversations]);
  const filteredConversations = useMemo(() => {
    const q = normalizeSearch(search);
    return conversations.filter((c) => {
      if (filterTab === 'unread' && c.unread === 0) return false;
      if (!q) return true;
      return normalizeSearch(`${c.parentName} ${c.phone} ${c.lastText}`).includes(q);
    });
  }, [conversations, filterTab, search]);

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
        <div className="flex flex-col gap-2 border-b border-[var(--borderColor-muted)] bg-[#fcfdff] px-3.5 py-2.5 dark:bg-transparent">
          <TextInput
            block
            type="search"
            leadingVisual={SearchIcon}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm phụ huynh hoặc nội dung…"
            aria-label="Tìm cuộc trò chuyện"
            className="[&::-webkit-search-cancel-button]:hidden"
          />
          <ChipGroup label="Lọc hội thoại">
            <Chip selected={filterTab === 'all'} count={conversations.length} onClick={() => setFilterTab('all')}>
              Tất cả
            </Chip>
            <Chip selected={filterTab === 'unread'} count={unreadTotal} onClick={() => setFilterTab('unread')}>
              Chưa đọc
            </Chip>
          </ChipGroup>
        </div>
        {filteredConversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--fgColor-muted)]">
            Không có cuộc trò chuyện nào khớp bộ lọc.
          </div>
        ) : (
          <ul
            aria-label="Cuộc trò chuyện"
            className="m-0 flex max-h-[62dvh] list-none flex-col divide-y divide-[var(--borderColor-muted)] overflow-y-auto p-0 scroll-quiet"
          >
            {filteredConversations.map((c) => {
            const active = selected?.parentId === c.parentId;
            return (
              <li key={c.parentId}>
                <Link
                  href={`/tin-nhan?p=${c.parentId}`}
                  data-card="true"
                  aria-current={active ? 'true' : undefined}
                  className={`flex items-start gap-3 px-3.5 py-3 transition-colors ${
                    active
                      ? 'bg-[var(--primary-soft)]/65 shadow-[inset_3px_0_0_var(--primary)]'
                      : 'bg-[var(--bgColor-default)] hover:bg-[#f8fafc] dark:hover:bg-[var(--bgColor-muted)]/75'
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
        )}
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
              <span className="inline-flex items-center gap-1.5">
                <DeviceMobileIcon size={13} className="text-[var(--fgColor-muted)]" aria-hidden />
                <span>Số điện thoại:</span>
                <code className="rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-[var(--fgColor-default)]">
                  {selected.phone}
                </code>
              </span>
              <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/70 px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-[var(--ink-2)]">
                {thread.length} tin nhắn
              </span>
            </div>

            <ol
              aria-label="Tin nhắn"
              className="m-0 flex max-h-[52dvh] min-h-[260px] list-none flex-col gap-2.5 overflow-y-auto bg-[#f8fafc] p-4 scroll-quiet dark:bg-[var(--bgColor-inset)]"
            >
              {thread.map((m) => (
                <li
                  key={m.id}
                  className={`flex max-w-[84%] flex-col gap-1 px-3.5 py-2.5 ${
                    m.direction === 'out'
                      ? 'self-end rounded-2xl rounded-br-[4px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] text-[var(--fgColor-default)] shadow-2xs'
                      : 'self-start rounded-2xl rounded-bl-[4px] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] shadow-xs'
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

            <div className="border-t border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] px-4 py-3 max-[767px]:px-3.5">
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
