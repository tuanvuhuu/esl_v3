'use client';

import { Check, History, Lock, LockOpen, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
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
import { PageHeader } from '@/components/ui/PageHeader';
import { ActIcon } from '@/components/ui/ActIcon';
import { Avatar, EmptyState, Pill, type Tone, Alert } from '@/components/ui/primitives';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { AccountForm, type TeacherOption } from './AccountForm';
import type { CampusOption } from '@/lib/campus';
import { Toast } from '@/components/ui/Toast';
import { EmptyPanel, Panel, Card } from '@/components/ui/surfaces';
import { Btn } from '@/components/ui/Btn';
import { Chip, ChipGroup, TextInput } from '@/components/ui/controls';
import { SelectPanel } from '@/components/ui/SelectPanel';

export type TabKey = 'nguoi-dung' | 'phan-quyen' | 'nhat-ky';

const ROLE_TONE: Record<Role, Tone> = { admin: 'butter', academic: 'mint', teacher: 'lav', accountant: 'stone' };

const ACCOUNT_COLUMNS: GridColumn<AccountRow>[] = [
  { key: 'name', label: 'Thành viên', width: 'minmax(150px,2fr)', sortValue: (r) => r.fullName },
  { key: 'role', label: 'Vai trò', width: 'minmax(124px,1fr)', sortValue: (r) => r.roleLabel },
  { key: 'campus', label: 'Cơ sở', width: 'minmax(120px,1.2fr)', sortValue: (r) => (r.role === 'admin' ? '' : r.campusIds.join(',')) },
  { key: 'link', label: 'Liên kết', width: 'minmax(88px,1fr)', sortValue: (r) => r.teacherName ?? '' },
  { key: 'last', label: 'Đăng nhập gần nhất', width: 'minmax(120px,1.1fr)', sortValue: (r) => r.lastLoginAt ?? '' },
  { key: 'status', label: 'Trạng thái', width: 'minmax(96px,1fr)', sortValue: (r) => r.status },
  { key: 'actions', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
];

const AUDIT_COLUMNS: GridColumn<AuditRow>[] = [
  { key: 'time', label: 'Thời điểm', width: '136px', sortValue: (a) => a.createdAt },
  { key: 'action', label: 'Thao tác', width: '112px', sortValue: (a) => a.action },
  { key: 'summary', label: 'Nội dung', width: 'minmax(0,1fr)' },
  { key: 'actor', label: 'Người thực hiện', width: '120px', sortValue: (a) => a.accountName ?? '' },
];

type Props = {
  tab: TabKey;
  accounts: AccountRow[];
  total: number;
  filters: { q: string; role: string; status: string };
  teachers: TeacherOption[];
  campuses: CampusOption[];
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

export function AccountsView({ tab, accounts, total, filters, teachers, campuses, matrix, audit, canManage, isAdmin }: Props) {
  return (
    <section className="flex flex-col gap-5">
      {/* Dùng chung PageHeader như mọi màn: từ 768px tên trang nằm ở thanh trên cùng */}
      <PageHeader crumbs={['Hệ thống', 'Tài khoản & quyền']} title="Tài khoản & quyền" subtitle="Ai được truy cập những gì trong hệ thống." />

      <ChipGroup tabs label="Mục" className="overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Chip key={t.key} tab selected={t.key === tab} href={`/tai-khoan${t.key === 'nguoi-dung' ? '' : `?tab=${t.key}`}`}>
              <Icon className="size-4" aria-hidden />
              {t.label}
            </Chip>
          );
        })}
      </ChipGroup>

      {tab === 'nguoi-dung' && <UsersTab accounts={accounts} total={total} filters={filters} teachers={teachers} campuses={campuses} canManage={canManage} />}
      {tab === 'phan-quyen' && <PermissionsTab matrix={matrix} canManage={isAdmin} />}
      {tab === 'nhat-ky' && <AuditTab audit={audit} />}
    </section>
  );
}

// ---------- Người dùng ----------

function UsersTab({ accounts, total, filters, teachers, campuses, canManage }: { accounts: AccountRow[]; total: number; filters: Props['filters']; teachers: TeacherOption[]; campuses: CampusOption[]; canManage: boolean }) {
  const campusText = (row: AccountRow) => (row.role === 'admin' ? 'Mọi cơ sở' : row.campusIds.map((id) => campuses.find((c) => c.id === id)?.name ?? `#${id}`).join(', '));
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

  const accountCell = (row: AccountRow, key: string) => {
    switch (key) {
      case 'name':
        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={row.fullName} seed={row.id} />
            <div className="min-w-0">
              <b className="block truncate text-base text-ink">{row.fullName}</b>
              <small className="block truncate text-xs text-muted">{row.email}</small>
            </div>
          </div>
        );
      case 'role':
        return <Pill tone={ROLE_TONE[row.role]}>{row.roleLabel}</Pill>;
      case 'campus':
        return <div className="min-w-0 truncate text-sm text-ink-2" title={campusText(row)}>{campusText(row)}</div>;
      case 'link':
        return <div className="min-w-0 truncate text-sm text-ink-2">{row.teacherName ?? ''}</div>;
      case 'last':
        return <div className="whitespace-nowrap text-sm tabular-nums text-ink-2">{row.lastLoginAt ? formatTime(row.lastLoginAt) : 'Chưa đăng nhập'}</div>;
      case 'status':
        return <Pill tone={row.status === 'active' ? 'mint' : 'blush'}>{row.status === 'active' ? 'Hoạt động' : 'Tạm khoá'}</Pill>;
      case 'actions':
        return (
          <div className="flex justify-end">
            <RowMenu label={`Thao tác với ${row.fullName}`} items={menuItems(row)} />
          </div>
        );
      default:
        return null;
    }
  };

  const accountCard = (row: AccountRow) => (
    <Card>
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
        {campusText(row) && <small className="truncate text-xs text-muted">{campusText(row)}</small>}
      </div>
      <div className="flex justify-end gap-2">
        <ActIcon label={`Sửa ${row.fullName}`} onClick={() => openEdit(row)} disabled={!canManage}>
          <Pencil className="size-4" aria-hidden />
        </ActIcon>
        <ActIcon label={`Xoá ${row.fullName}`} danger onClick={() => setToDelete(row)} disabled={!canManage || row.role === 'admin'}>
          <Trash2 className="size-4" aria-hidden />
        </ActIcon>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <form method="get" action="/tai-khoan" role="search" className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <TextInput name="q" type="search" defaultValue={filters.q} placeholder="Tìm theo tên hoặc email" className="flex-1" />
          <SelectPanel
            name="role"
            label="Vai trò"
            auto
            defaultValue={filters.role}
            options={[{ value: '', label: 'Mọi vai trò' }, ...ROLE_CODES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))]}
          />
          <SelectPanel
            name="status"
            label="Trạng thái"
            auto
            defaultValue={filters.status}
            options={[
              { value: '', label: 'Mọi trạng thái' },
              { value: 'active', label: 'Hoạt động' },
              { value: 'locked', label: 'Tạm khoá' },
            ]}
          />
          <Btn type="submit" variant="ghost">Lọc</Btn>
        </form>
        {canManage && (
          <Btn variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            Mời thành viên
          </Btn>
        )}
      </div>

      <p className="text-sm text-muted">{accounts.length} trên {total} tài khoản</p>

      <DataGrid
        label="Danh sách tài khoản"
        columns={ACCOUNT_COLUMNS}
        rows={accounts}
        rowKey={(r) => r.id}
        cell={accountCell}
        card={accountCard}
        from="md"
        empty={
          <EmptyPanel title="Không có tài khoản phù hợp" hint="Thử đổi bộ lọc hoặc từ khoá." />
        }
      />

      <Toast message={message} />

      <Modal open={creating} title="Mời thành viên" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="account-create-title">
        <AccountForm mode="create" teachers={teachers} campuses={campuses} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa tài khoản" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="account-edit-title">
        {editing && <AccountForm mode="edit" accountId={editing.id} initial={editing.values} teachers={teachers} campuses={campuses} onDone={onDone} onCancel={() => setEditing(null)} />}
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
      {notice && <Alert>{notice}</Alert>}

      {/* Máy tính: ma trận đầy đủ */}
      <Panel padded={false} className="hidden overflow-hidden min-[768px]:block">
        <div role="table" aria-label="Ma trận quyền" className="grid grid-cols-[minmax(220px,2fr)_repeat(4,minmax(90px,1fr))]">
          <div role="columnheader" className="border-b border-line px-4 py-3 text-xs font-normal text-muted">Quyền</div>
          {ROLE_CODES.map((r) => (
            <div key={r} role="columnheader" className="border-b border-line px-2 py-3 text-center text-sm font-normal text-ink">{ROLE_LABELS[r]}</div>
          ))}
          {PERMISSIONS.map((p) => (
            <PermissionCells key={p.key} label={p.label} permission={p.key} matrix={matrix} isLocked={isLocked} canManage={canManage} onToggle={toggle} pending={pending} />
          ))}
        </div>
      </Panel>

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
      <ChipGroup tabs label="Chọn vai trò" className="overflow-x-auto">
        {ROLE_CODES.map((r) => (
          <Chip key={r} tab selected={r === role} onClick={() => setRole(r)}>
            {ROLE_LABELS[r]}
          </Chip>
        ))}
      </ChipGroup>
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
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-ctl)] border border-line bg-surface px-3.5 py-2.5 text-left disabled:opacity-50"
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
  const cell = (a: AuditRow, key: string) => {
    switch (key) {
      case 'time':
        return <div className="whitespace-nowrap text-sm tabular-nums text-ink-2">{formatTime(a.createdAt)}</div>;
      case 'action':
        return <Pill tone="stone">{ACTION_LABEL[a.action] ?? a.action}</Pill>;
      case 'summary':
        return <div className="min-w-0 text-base text-ink">{a.summary}</div>;
      case 'actor':
        return <div className="min-w-0 truncate text-sm text-ink-2">{a.accountName ?? 'Hệ thống'}</div>;
      default:
        return null;
    }
  };

  const card = (a: AuditRow) => (
    <Card><div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0"><Pill tone="stone">{ACTION_LABEL[a.action] ?? a.action}</Pill></span>
      <div className="min-w-0 flex-1">
        <p className="text-base text-ink">{a.summary}</p>
        <small className="text-xs text-muted">{a.accountName ?? 'Hệ thống'} · {formatTime(a.createdAt)}</small>
      </div>
    </div></Card>
  );

  return (
    <DataGrid
      label="Nhật ký hoạt động"
      columns={AUDIT_COLUMNS}
      rows={audit}
      rowKey={(a) => a.id}
      cell={cell}
      card={card}
      from="md"
      empty={
        <Panel padded={false}>
          <EmptyState title="Chưa có hoạt động nào" />
        </Panel>
      }
    />
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const vn = new Date(d.getTime() + 7 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()} ${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}
