import { Suspense } from 'react';
import { MyTelegramPanel, TelegramInbox } from '@/components/telegram/TelegramInbox';
import { PageHeader } from '@/components/ui/PageHeader';
import { passes, requireParentAccess } from '@/lib/campus-access';
import { hasPermission } from '@/lib/permissions';
import { visibleParentIds } from '@/lib/queries/parents';
import { getCurrentAccount, getCurrentPermissions } from '@/lib/session';
import { isAccountLinked, listConversations, listThread, markThreadRead } from '@/lib/telegram/service';

type SearchParams = Record<string, string | string[] | undefined>;

// Tin nhắn Telegram với phụ huynh (P34). Ai cũng kết nối được Telegram của mình; hộp tin cần quyền quản lý phụ huynh
// và chỉ gồm phụ huynh có con học ở cơ sở trong phạm vi.
export default function MessagesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<section aria-busy="true" aria-label="Đang tải tin nhắn" className="h-[360px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />}>
      <MessagesData searchParams={searchParams} />
    </Suspense>
  );
}

async function MessagesData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [granted, account] = await Promise.all([getCurrentPermissions(), getCurrentAccount()]);
  const linked = account ? await isAccountLinked(account.id) : false;
  const canInbox = hasPermission(new Set(granted), 'parents.manage');

  let inbox = null;
  if (canInbox) {
    const visible = await visibleParentIds();
    const conversations = await listConversations(visible);
    const raw = Array.isArray(sp.p) ? sp.p[0] : sp.p;
    const id = raw && /^\d+$/.test(raw) ? Number(raw) : null;
    const selected = id !== null && (await passes(() => requireParentAccess(id))) ? (conversations.find((c) => c.parentId === id) ?? null) : null;
    const thread = selected ? await listThread(selected.parentId) : [];
    if (selected && selected.unread > 0) await markThreadRead(selected.parentId);
    inbox = <TelegramInbox conversations={conversations} selected={selected} thread={thread} />;
  }

  return (
    <section className="flex flex-col gap-4">
      <PageHeader crumbs={['Đào tạo', 'Tin nhắn']} title="Tin nhắn" subtitle="Trao đổi với phụ huynh qua bot Telegram của trung tâm." />
      <MyTelegramPanel linked={linked} />
      {inbox}
    </section>
  );
}
