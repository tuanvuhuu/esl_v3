'use client';

import { Check, History, Lock, LockOpen, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  deleteAccountAction,
  loadAccountForm,
  setAccountLockedAction,
  setRolePermissionAction,
  type AccountFormValues,
} from '@/app/(app)/tai-khoan/actions';
import type { AccountRow, AuditRow, RoleMatrix } from '@/lib/queries/accounts';
import { LOCKED_ADMIN_PERMISSIONS, PERMISSIONS, ROLE_CODES, ROLE_LABELS, type Permission, type Role } from '@/lib/permissions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { ActIcon } from '@/components/ui/ActIcon';
import { Avatar, EmptyState, Pill, type Tone } from '@/components/ui/primitives';
import { AccountForm, type TeacherOption } from './AccountForm';

export type TabKey = 'nguoi-dung' | 'phan-quyen' | 'nhat-ky';

const ROLE_TONE: Record<Role, Tone> = { admin: 'butter', academic: 'mint', teacher: 'lav', accountant: 'stone' };

type Props = {
  tab: TabKey;
  accounts: AccountRow[];
  total: number;
  filters: { q: string; role: string; status: string };
  teachers: TeacherOption[];
  matrix: RoleMatrix;
  audit: AuditRow[];
  canManage: boolean;
  isAdmin: boolean; // chỉ quản trị đổi được ma trận quyền
};

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'nguoi-dung', label: 'Người dùng', icon: Users },
  { key: 'phan-quyen', label: 'Phân quyền', icon: ShieldCheck },
  { key: 'nhat-ky', label: 'Nhật ký', icon: History },
];

export function AccountsView({ tab, accounts, total, filters, teachers, matrix, audit, canManage, isAdmin }: Props) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <PageCrumbs crumbs={['Hệ thống', 'Tài khoản & quyền']} />
          <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink">Tài khoản & quyền</h1>
          <p className="mt-2 text-base text-muted max-[767px]:mt-1.5 max-[767px]:text-sm">Ai được truy cập những gì trong hệ thống.</p>
        </div>
      </header>

      <nav role="tablist" aria-label="Mục" className="flex gap-1.5 overflow-x-auto rounded-2xl bg-stone p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.key === tab;
          return (
            <Link key={t.key} href={`/tai-khoan${t.key === 'nguoi-dung' ? '' : `?tab=${t.key}`}`} role="tab" aria-selected={on} scroll={false}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-base font-bold transition-colors ${on ? 'bg-surface text-ink shadow-card' : 'text-stone-ink hover:text-ink'}`}>
              <Icon className="size-4" aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {tab === 'nguoi-dung' && <UsersTab accounts={accounts} total={total} filters={filters} teachers={teachers} canManage={canManage} />}
      {tab === 'phan-quyen' && <PermissionsTab matrix={matrix} canManage={isAdmin} />}
      {tab === 'nhat-ky' && <AuditTab audit={audit} />}
    </section>
  );
}

// ---------- Người dùng ----------

function UsersTab({ accounts, total, filters, teachers, canManage }: { accounts: AccountRow[]; total: number; filters: Props['filters']; teachers: TeacherOption[]; canManage: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: AccountFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<AccountRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [message]);

  const onDone = useCallback((text: string) => {
    setCreating(false);
    setEditing(null);
    setMessage(text);
    router.refresh();
  }, [router]);

  function openEdit(row: AccountRow) {
    startTransition(async () => {
      const r = await loadAccountForm(row.id);
      if (!r.ok) return setMessage(r.message);
      setEditing({ id: row.id, values: r.values });
    });
  }

  function toggleLock(row: AccountRow) {
    startTransition(async () => {
      const r = await setAccountLockedAction(row.id, row.status === 'active');
      setMessage(r.message ?? (r.ok ? 'Đã cập nhật' : 'Không cập nhật được'));
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const row = toDelete;
    startTransition(async () => {
      const r = await deleteAccountAction(row.id);
      setToDelete(null);
      setMessage(r.message ?? (r.ok ? 'Đã xoá' : 'Không xoá được'));
      router.refresh();
    });
  }

  const menuItems = (row: AccountRow): RowMenuItem[] => {
    const isAdmin = row.role === 'admin';
    return [
      { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => openEdit(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý tài khoản' },
      {
        kind: 'action',
        label: row.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá',
        icon: row.status === 'active' ? Lock : LockOpen,
        onSelect: () => toggleLock(row),
        disabled: !canManage,
        disabledHint: 'Không có quyền quản lý tài khoản',
      },
      {
        kind: 'action',
        label: 'Xoá',
        icon: Trash2,
        danger: true,
        onSelect: () => setToDelete(row),
        disabled: !canManage || isAdmin,
        disabledHint: isAdmin ? 'Không xoá được tài khoản quản trị' : 'Không có quyền quản lý tài khoản',
      },
    ];
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <form method="get" action="/tai-khoan" role="search" className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Tìm theo tên hoặc email"
            className="h-11 min-w-0 flex-1 rounded-[14px] border border-line bg-surface px-3.5 text-input text-ink outline-none placeholder:text-muted focus:border-primary-deep"
          />
          <select name="role" defaultValue={filters.role} className="h-11 rounded-[14px] border border-line bg-surface px-3 text-base font-semibold text-ink">
            <option value="">Mọi vai trò</option>
            {ROLE_CODES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <select name="status" defaultValue={filters.status} className="h-11 rounded-[14px] border border-line bg-surface px-3 text-base font-semibold text-ink">
            <option value="">Mọi trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="locked">Tạm khoá</option>
          </select>
          <button type="submit" className="h-11 rounded-[14px] bg-stone px-4 text-base font-bold text-ink">Lọc</button>
        </form>
        {canManage && (
          <button type="button" onClick={() => setCreating(true)} className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-primary px-4 text-base font-bold text-on-primary">
            <Plus className="size-4" aria-hidden />
            Mời thành viên
          </button>
        )}
      </div>

      <p className="text-sm text-muted">{accounts.length} trên {total} tài khoản</p>

      {accounts.length === 0 ? (
        <div className="rounded-[24px] bg-surface shadow-card"><EmptyState title="Không có tài khoản phù hợp" hint="Thử đổi bộ lọc hoặc từ khoá." /></div>
      ) : (
        <>
          {/* Máy tính: bảng, thao tác qua nút ⋯ */}
          <div className="hidden overflow-hidden rounded-[24px] bg-surface shadow-card min-[768px]:block">
            <div role="table" aria-label="Danh sách tài khoản">
              <div role="row" className="grid grid-cols-[minmax(150px,2fr)_minmax(124px,1fr)_minmax(88px,1fr)_minmax(120px,1.1fr)_minmax(96px,1fr)_44px] gap-x-3 border-b border-line px-4 py-2.5 text-xs font-semibold text-muted">
                <span role="columnheader">Thành viên</span>
                <span role="columnheader">Vai trò</span>
                <span role="columnheader">Liên kết</span>
                <span role="columnheader">Đăng nhập gần nhất</span>
                <span role="columnheader">Trạng thái</span>
                <span role="columnheader" className="sr-only">Thao tác</span>
              </div>
              {accounts.map((row) => (
                <div key={row.id} role="row" className="grid grid-cols-[minmax(150px,2fr)_minmax(124px,1fr)_minmax(88px,1fr)_minmax(120px,1.1fr)_minmax(96px,1fr)_44px] items-center gap-x-3 border-b border-line px-4 py-3.5 last:border-0 hover:bg-row-hover">
                  <div role="cell" className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.fullName} seed={row.id} />
                    <div className="min-w-0">
                      <b className="block truncate text-base text-ink">{row.fullName}</b>
                      <small className="block truncate text-xs text-muted">{row.email}</small>
                    </div>
                  </div>
                  <div role="cell"><Pill tone={ROLE_TONE[row.role]}>{row.roleLabel}</Pill></div>
                  <div role="cell" className="min-w-0 truncate text-sm text-ink-2">{row.teacherName ?? '—'}</div>
                  <div role="cell" className="whitespace-nowrap text-sm tabular-nums text-ink-2">{row.lastLoginAt ? formatTime(row.lastLoginAt) : 'Chưa đăng nhập'}</div>
                  <div role="cell"><Pill tone={row.status === 'active' ? 'mint' : 'blush'}>{row.status === 'active' ? 'Hoạt động' : 'Tạm khoá'}</Pill></div>
                  <div role="cell" className="flex justify-end">
                    <RowMenu label={`Thao tác với ${row.fullName}`} items={menuItems(row)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Điện thoại: thẻ, thao tác bằng icon Sửa và Xoá */}
          <div className="flex flex-col gap-3 min-[768px]:hidden">
            {accounts.map((row) => (
              <article key={row.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.5 shadow-card">
                <div className="flex items-start gap-3">
                  <Avatar name={row.fullName} seed={row.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <b className="min-w-0 truncate text-base text-ink">{row.fullName}</b>
                      <Pill tone={row.status === 'active' ? 'mint' : 'blush'}>{row.status === 'active' ? 'Hoạt động' : 'Tạm khoá'}</Pill>
                    </div>
                    <small className="block truncate text-xs text-muted">{row.email}</small>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Pill tone={ROLE_TONE[row.role]}>{row.roleLabel}</Pill>
                  {row.teacherName && <small className="truncate text-xs text-muted">{row.teacherName}</small>}
                </div>
                <div className="flex justify-end gap-2">
                  <ActIcon label={`Sửa ${row.fullName}`} onClick={() => openEdit(row)} disabled={!canManage}>
                    <Pencil className="size-4" aria-hidden />
                  </ActIcon>
                  <ActIcon label={`Xoá ${row.fullName}`} danger onClick={() => setToDelete(row)} disabled={!canManage || row.role === 'admin'}>
                    <Trash2 className="size-4" aria-hidden />
                  </ActIcon>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {message && (
        <div role="status" className="fixed inset-x-0 bottom-[calc(96px+var(--safe-b))] z-[95] mx-auto w-fit max-w-[calc(100%-32px)] rounded-full border border-line bg-surface px-4 py-2.5 text-center text-base font-semibold text-ink shadow-lift min-[768px]:bottom-6">
          {message}
        </div>
      )}

      <Modal open={creating} title="Mời thành viên" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="account-create-title">
        <AccountForm mode="create" teachers={teachers} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa tài khoản" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="account-edit-title">
        {editing && <AccountForm mode="edit" accountId={editing.id} initial={editing.values} teachers={teachers} onDone={onDone} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        title="Xoá tài khoản này?"
        text={toDelete ? `${toDelete.email} sẽ không đăng nhập được nữa. Không thể hoàn tác.` : ''}
        confirmLabel="Xoá tài khoản"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

// ---------- Phân quyền ----------

function PermissionsTab({ matrix, canManage }: { matrix: RoleMatrix; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function toggle(role: Role, permission: Permission, granted: boolean) {
    startTransition(async () => {
      const r = await setRolePermissionAction(role, permission, granted);
      if (!r.ok) setNotice(r.message ?? 'Không lưu được');
      else setNotice(null);
      router.refresh();
    });
  }

  const isLocked = (role: Role, permission: Permission) => role === 'admin' && (LOCKED_ADMIN_PERMISSIONS as string[]).includes(permission);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Đánh dấu những việc mỗi vai trò được làm. Quản trị luôn giữ quyền quản lý tài khoản và cài đặt.</p>
      {notice && <div role="status" className="rounded-xl bg-blush px-4 py-2.5 text-base font-semibold text-blush-ink">{notice}</div>}

      {/* Máy tính: ma trận đầy đủ */}
      <div className="hidden overflow-hidden rounded-[24px] bg-surface shadow-card min-[768px]:block">
        <div role="table" aria-label="Ma trận quyền" className="grid grid-cols-[minmax(220px,2fr)_repeat(4,minmax(90px,1fr))]">
          <div role="columnheader" className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">Quyền</div>
          {ROLE_CODES.map((r) => (
            <div key={r} role="columnheader" className="border-b border-line px-2 py-3 text-center text-sm font-bold text-ink">{ROLE_LABELS[r]}</div>
          ))}
          {PERMISSIONS.map((p) => (
            <PermissionCells key={p.key} label={p.label} permission={p.key} matrix={matrix} isLocked={isLocked} canManage={canManage} onToggle={toggle} pending={pending} />
          ))}
        </div>
      </div>

      {/* Điện thoại: chọn vai trò rồi bật tắt từng quyền */}
      <PhonePermissions matrix={matrix} canManage={canManage} isLocked={isLocked} onToggle={toggle} pending={pending} />
    </div>
  );
}

function PermissionCells({ label, permission, matrix, isLocked, canManage, onToggle, pending }: {
  label: string;
  permission: Permission;
  matrix: RoleMatrix;
  isLocked: (r: Role, p: Permission) => boolean;
  canManage: boolean;
  onToggle: (r: Role, p: Permission, g: boolean) => void;
  pending: boolean;
}) {
  return (
    <>
      <div role="cell" className="flex items-center border-b border-line px-4 py-3 text-base font-semibold text-ink">{label}</div>
      {ROLE_CODES.map((r) => {
        const granted = matrix[r][permission];
        const locked = isLocked(r, permission) || !canManage;
        return (
          <div key={r} role="cell" className="flex items-center justify-center border-b border-line px-2 py-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={granted}
              aria-label={`${label} — ${ROLE_LABELS[r]}`}
              disabled={locked || pending}
              onClick={() => onToggle(r, permission, !granted)}
              className={`grid size-7 place-items-center rounded-lg border transition-colors disabled:opacity-50 ${granted ? 'border-accent bg-accent text-surface' : 'border-line bg-bg text-transparent'}`}
            >
              <Check className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </>
  );
}

function PhonePermissions({ matrix, canManage, isLocked, onToggle, pending }: {
  matrix: RoleMatrix;
  canManage: boolean;
  isLocked: (r: Role, p: Permission) => boolean;
  onToggle: (r: Role, p: Permission, g: boolean) => void;
  pending: boolean;
}) {
  const [role, setRole] = useState<Role>('academic');
  return (
    <div className="flex flex-col gap-3 min-[768px]:hidden">
      <div role="tablist" aria-label="Chọn vai trò" className="flex gap-1.5 overflow-x-auto">
        {ROLE_CODES.map((r) => (
          <button key={r} type="button" role="tab" aria-selected={r === role} onClick={() => setRole(r)}
            className={`h-10 shrink-0 rounded-full px-3.5 text-sm font-bold ${r === role ? 'bg-primary text-on-primary' : 'bg-stone text-stone-ink'}`}>
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {PERMISSIONS.map((p) => {
          const granted = matrix[role][p.key];
          const locked = isLocked(role, p.key) || !canManage;
          return (
            <li key={p.key}>
              <button
                type="button"
                role="switch"
                aria-checked={granted}
                disabled={locked || pending}
                onClick={() => onToggle(role, p.key, !granted)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2.5 text-left disabled:opacity-50"
              >
                <span className="text-base font-semibold text-ink">{p.label}</span>
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${granted ? 'bg-accent' : 'bg-stone'}`} aria-hidden>
                  <span className={`absolute top-0.5 size-5 rounded-full bg-surface shadow transition-transform ${granted ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Nhật ký ----------

const ACTION_LABEL: Record<string, string> = {
  create: 'Thêm',
  update: 'Sửa',
  delete: 'Xoá',
  lock: 'Khoá',
  unlock: 'Mở khoá',
  grant: 'Cấp quyền',
  revoke: 'Gỡ quyền',
  seed: 'Nạp dữ liệu',
};

function AuditTab({ audit }: { audit: AuditRow[] }) {
  if (audit.length === 0) return <div className="rounded-[24px] bg-surface shadow-card"><EmptyState title="Chưa có hoạt động nào" /></div>;
  return (
    <div className="overflow-hidden rounded-[24px] bg-surface shadow-card">
      {/* Máy tính: bảng, nội dung được xuống dòng để không mất thông tin */}
      <div role="table" aria-label="Nhật ký hoạt động" className="hidden min-[768px]:block">
        <div role="row" className="grid grid-cols-[136px_112px_minmax(0,1fr)_120px] gap-x-3 border-b border-line px-4 py-2.5 text-xs font-semibold text-muted">
          <span role="columnheader">Thời điểm</span>
          <span role="columnheader">Thao tác</span>
          <span role="columnheader">Nội dung</span>
          <span role="columnheader">Người thực hiện</span>
        </div>
        {audit.map((a) => (
          <div key={a.id} role="row" className="grid grid-cols-[136px_112px_minmax(0,1fr)_120px] items-center gap-x-3 border-b border-line px-4 py-3 last:border-0">
            <div role="cell" className="whitespace-nowrap text-sm tabular-nums text-ink-2">{formatTime(a.createdAt)}</div>
            <div role="cell"><Pill tone="stone">{ACTION_LABEL[a.action] ?? a.action}</Pill></div>
            <div role="cell" className="min-w-0 text-base text-ink">{a.summary}</div>
            <div role="cell" className="min-w-0 truncate text-sm text-ink-2">{a.accountName ?? 'Hệ thống'}</div>
          </div>
        ))}
      </div>
      {/* Điện thoại: danh sách */}
      <ul className="divide-y divide-line min-[768px]:hidden">
        {audit.map((a) => (
          <li key={a.id} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0"><Pill tone="stone">{ACTION_LABEL[a.action] ?? a.action}</Pill></span>
            <div className="min-w-0 flex-1">
              <p className="text-base text-ink">{a.summary}</p>
              <small className="text-xs text-muted">{a.accountName ?? 'Hệ thống'} · {formatTime(a.createdAt)}</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const vn = new Date(d.getTime() + 7 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()} ${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}
