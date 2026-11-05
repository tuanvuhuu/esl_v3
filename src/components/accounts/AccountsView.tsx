'use client';

import {
  CheckIcon,
  HistoryIcon,
  LockIcon,
  PencilIcon,
  PeopleIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  TrashIcon,
  UnlockIcon,
} from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  deleteAccountAction,
  loadAccountForm,
  setAccountLockedAction,
  setRolePermissionAction,
  type AccountFormValues,
} from '@/app/(app)/tai-khoan/actions';
import { SelectBox, TextInput } from '@/components-ui';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert, Avatar, InitialBadge, Pill, type Tone } from '@/components/ui/primitives';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Card, EmptyPanel, Panel } from '@/components/ui/surfaces';
import { Toast } from '@/components/ui/Toast';
import type { CampusOption } from '@/lib/campus';
import { LOCKED_ADMIN_PERMISSIONS, PERMISSIONS, ROLE_CODES, ROLE_LABELS, type Permission, type Role } from '@/lib/permissions';
import type { AccountRow, AuditRow, RoleMatrix } from '@/lib/queries/accounts';
import { AccountForm, type TeacherOption } from './AccountForm';

export type TabKey = 'nguoi-dung' | 'phan-quyen' | 'nhat-ky';

const ROLE_TONE: Record<Role, Tone> = { admin: 'butter', academic: 'mint', teacher: 'lav', accountant: 'stone' };

const ACCOUNT_COLUMNS: GridColumn<AccountRow>[] = [
  { key: 'name', label: 'Thành viên', width: '236px', sortValue: (r) => r.fullName },
  { key: 'role', label: 'Vai trò & liên kết', width: 'minmax(176px,1.35fr)', sortValue: (r) => r.roleLabel },
  { key: 'campus', label: 'Phạm vi cơ sở', width: 'minmax(176px,1.45fr)', sortValue: (r) => (r.role === 'admin' ? '' : r.campusIds.join(',')) },
  { key: 'last', label: 'Đăng nhập gần nhất', width: '176px', sortValue: (r) => r.lastLoginAt ?? '' },
  { key: 'status', label: 'Trạng thái', width: '128px', sortValue: (r) => r.status },
  { key: 'actions', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
];

const AUDIT_COLUMNS: GridColumn<AuditRow>[] = [
  { key: 'time', label: 'Thời điểm', width: 'minmax(144px,1.05fr)', sortValue: (a) => a.createdAt },
  { key: 'action', label: 'Thao tác', width: 'minmax(116px,0.9fr)', sortValue: (a) => a.action },
  { key: 'summary', label: 'Nội dung', width: 'minmax(220px,2.3fr)' },
  { key: 'actor', label: 'Người thực hiện', width: 'minmax(156px,1.15fr)', sortValue: (a) => a.accountName ?? '' },
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

const TABS: { key: TabKey; label: string; icon: typeof PeopleIcon }[] = [
  { key: 'nguoi-dung', label: 'Người dùng', icon: PeopleIcon },
  { key: 'phan-quyen', label: 'Phân quyền', icon: ShieldCheckIcon },
  { key: 'nhat-ky', label: 'Nhật ký', icon: HistoryIcon },
];

export function AccountsView({ tab, accounts, total, filters, teachers, campuses, matrix, audit, canManage, isAdmin }: Props) {
  return (
    <section className="flex flex-col gap-2.5">
      {/* Dùng chung PageHeader như mọi màn: từ 768px tên trang nằm ở thanh trên cùng */}
      <PageHeader crumbs={['Hệ thống', 'Tài khoản & quyền']} title="Tài khoản & quyền" subtitle="Ai được truy cập những gì trong hệ thống." />

      <ChipGroup tabs label="Mục" className="overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Chip key={t.key} tab selected={t.key === tab} href={`/tai-khoan${t.key === 'nguoi-dung' ? '' : `?tab=${t.key}`}`}>
              <Icon size={16} aria-hidden />
              {t.label}
            </Chip>
          );
        })}
      </ChipGroup>

      {tab === 'nguoi-dung' && (
        <UsersTab accounts={accounts} total={total} filters={filters} teachers={teachers} campuses={campuses} canManage={canManage} />
      )}
      {tab === 'phan-quyen' && <PermissionsTab matrix={matrix} canManage={isAdmin} />}
      {tab === 'nhat-ky' && <AuditTab audit={audit} />}
    </section>
  );
}

// ---------- Người dùng ----------

function UsersTab({
  accounts,
  filters,
  teachers,
  campuses,
  canManage,
}: {
  accounts: AccountRow[];
  total: number;
  filters: Props['filters'];
  teachers: TeacherOption[];
  campuses: CampusOption[];
  canManage: boolean;
}) {
  const campusText = (row: AccountRow) =>
    row.role === 'admin' ? 'Mọi cơ sở' : row.campusIds.map((id) => campuses.find((c) => c.id === id)?.name ?? `#${id}`).join(', ');
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState<string>(filters.role || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(filters.status || 'all');
  const [q, setQ] = useState<string>(filters.q || '');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: AccountFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<AccountRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shownAccounts = accounts.filter((a) => {
    if (roleFilter !== 'all' && a.role !== roleFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${a.fullName} ${a.email} ${a.teacherName ?? ''}`.toLowerCase().includes(needle);
  });

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [message]);

  const onDone = useCallback(
    (text: string) => {
      setCreating(false);
      setEditing(null);
      setMessage(text);
      router.refresh();
    },
    [router],
  );

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
      {
        kind: 'action',
        label: 'Sửa',
        icon: PencilIcon,
        onSelect: () => openEdit(row),
        disabled: !canManage,
        disabledHint: 'Không có quyền quản lý tài khoản',
      },
      {
        kind: 'action',
        label: row.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá',
        icon: row.status === 'active' ? LockIcon : UnlockIcon,
        onSelect: () => toggleLock(row),
        disabled: !canManage,
        disabledHint: 'Không có quyền quản lý tài khoản',
      },
      {
        kind: 'action',
        label: 'Xoá',
        icon: TrashIcon,
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
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={row.fullName} seed={row.id} size="sm" />
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-[13.5px] font-semibold text-[var(--fgColor-default)]">{row.fullName}</span>
              <small className="block truncate text-xs text-[var(--fgColor-muted)]">{row.email}</small>
            </div>
          </div>
        );
      case 'role':
        return (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Pill tone={ROLE_TONE[row.role]}>{row.roleLabel}</Pill>
            {row.teacherName && (
              <span className="inline-flex max-w-full items-center truncate rounded-[5px] border border-[#c7d2fe] bg-[#eef2ff] px-1.5 py-0.5 text-[11px] font-medium text-[#4338ca] dark:border-[#3730a3] dark:bg-[#1e1b4b] dark:text-[#a5b4fc]">
                GV · {row.teacherName}
              </span>
            )}
          </div>
        );
      case 'campus':
        if (row.role === 'admin') {
          return (
            <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--primary-deep)]">
              Mọi cơ sở
            </span>
          );
        }
        return row.campusIds.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1" title={campusText(row)}>
            {row.campusIds.map((id) => (
              <span
                key={id}
                className="inline-flex max-w-full items-center truncate rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-[11.5px] font-medium text-[var(--ink-2)]"
              >
                {campuses.find((c) => c.id === id)?.name ?? `#${id}`}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-[var(--fgColor-muted)]">Chưa gán cơ sở</span>
        );
      case 'last':
        return row.lastLoginAt ? (
          <span className="inline-flex items-center whitespace-nowrap rounded-[5px] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/70 px-1.5 py-0.5 font-mono text-xs tabular-nums text-[var(--ink-2)]">
            {formatTime(row.lastLoginAt)}
          </span>
        ) : (
          <span className="whitespace-nowrap text-xs text-[var(--fgColor-muted)]">Chưa đăng nhập</span>
        );
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
            <b className="min-w-0 truncate text-base font-semibold text-[var(--fgColor-default)]">{row.fullName}</b>
            <Pill tone={row.status === 'active' ? 'mint' : 'blush'}>{row.status === 'active' ? 'Hoạt động' : 'Tạm khoá'}</Pill>
          </div>
          <small className="block truncate text-xs text-[var(--fgColor-muted)]">{row.email}</small>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={ROLE_TONE[row.role]}>{row.roleLabel}</Pill>
        {row.teacherName && (
          <span className="inline-flex max-w-full items-center truncate rounded-[5px] border border-[#c7d2fe] bg-[#eef2ff] px-2 py-0.5 text-[11.5px] font-medium text-[#4338ca] dark:border-[#3730a3] dark:bg-[#1e1b4b] dark:text-[#a5b4fc]">
            {row.teacherName}
          </span>
        )}
        {row.role === 'admin' ? (
          <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--primary-deep)]">
            Mọi cơ sở
          </span>
        ) : (
          campusText(row) && (
            <span className="inline-flex max-w-full items-center truncate rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-[11.5px] font-medium text-[var(--ink-2)]">
              {campusText(row)}
            </span>
          )
        )}
      </div>
      <div className="flex justify-end gap-2">
        <ActIcon label={`Sửa ${row.fullName}`} icon={PencilIcon} onClick={() => openEdit(row)} disabled={!canManage} />
        <ActIcon
          label={`Xoá ${row.fullName}`}
          icon={TrashIcon}
          danger
          onClick={() => setToDelete(row)}
          disabled={!canManage || row.role === 'admin'}
        />
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-2">
      <DataGrid
        label="Danh sách tài khoản"
        columns={ACCOUNT_COLUMNS}
        rows={shownAccounts}
        rowKey={(r) => r.id}
        cell={accountCell}
        card={accountCard}
        from="md"
        fill
        stickyEnd
        title={
          <ChipGroup label="Lọc theo vai trò">
            <Chip selected={roleFilter === 'all'} count={accounts.length} onClick={() => setRoleFilter('all')}>
              Tất cả
            </Chip>
            {ROLE_CODES.map((r) => (
              <Chip
                key={r}
                selected={roleFilter === r}
                count={accounts.filter((a) => a.role === r).length}
                onClick={() => setRoleFilter(r)}
              >
                {ROLE_LABELS[r]}
              </Chip>
            ))}
          </ChipGroup>
        }
        actionComponent={
          <>
            <div className="w-48 max-w-full">
              <TextInput
                block
                type="search"
                leadingVisual={SearchIcon}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm tên hoặc email…"
                aria-label="Tìm tài khoản"
                className="[&::-webkit-search-cancel-button]:hidden"
              />
            </div>
            <SelectBox
              label="Trạng thái"
              auto
              variant="bar"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v || 'all')}
              options={[
                { value: 'all', label: 'Mọi trạng thái' },
                { value: 'active', label: 'Hoạt động' },
                { value: 'locked', label: 'Tạm khoá' },
              ]}
            />
            {canManage && (
              <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setCreating(true)}>
                Mời thành viên
              </Btn>
            )}
          </>
        }
        empty={<EmptyPanel title="Không có tài khoản phù hợp" hint="Thử đổi bộ lọc hoặc từ khoá." />}
      />

      <Toast message={message} />

      <Modal
        open={creating}
        size="md"
        title="Mời thành viên"
        subtitle="Tạo tài khoản nhân sự với mật khẩu mặc định và gán cơ sở làm việc. Các trường có dấu * là bắt buộc."
        onClose={() => setCreating(false)}
        labelledBy="account-create-title"
      >
        <AccountForm mode="create" teachers={teachers} campuses={campuses} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal
        open={!!editing}
        size="md"
        title="Sửa tài khoản"
        subtitle="Cập nhật vai trò, trạng thái đăng nhập hoặc phạm vi cơ sở. Các trường có dấu * là bắt buộc."
        onClose={() => setEditing(null)}
        labelledBy="account-edit-title"
      >
        {editing && (
          <AccountForm
            mode="edit"
            accountId={editing.id}
            initial={editing.values}
            teachers={teachers}
            campuses={campuses}
            onDone={onDone}
            onCancel={() => setEditing(null)}
          />
        )}
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
    <div className="tsukuba-rise flex flex-col gap-3">
      <p className="m-0 text-sm text-[var(--fgColor-muted)]">
        Đánh dấu những việc mỗi vai trò được làm. Quản trị luôn giữ quyền quản lý tài khoản và cài đặt hệ thống.
      </p>
      {notice && <Alert>{notice}</Alert>}

      {/* Máy tính: ma trận đầy đủ — lưu ý giữ font-normal (400) trên mọi [role="columnheader"] theo chuẩn giao diện */}
      <Panel padded={false} className="hidden overflow-hidden min-[768px]:block">
        <div role="table" aria-label="Ma trận quyền" className="flex flex-col">
          <div
            role="row"
            className="grid grid-cols-[minmax(220px,2fr)_repeat(4,minmax(96px,1fr))] border-b border-[var(--borderColor-default)] bg-[#f8fafc] dark:bg-[var(--bgColor-muted)]"
          >
            <div
              role="columnheader"
              className="flex items-center px-4 py-2.5 text-xs font-normal uppercase tracking-wide text-[var(--fgColor-muted)]"
            >
              Quyền thao tác
            </div>
            {ROLE_CODES.map((r) => (
              <div
                key={r}
                role="columnheader"
                className="flex items-center justify-center px-2 py-2.5 text-center text-xs font-normal text-[var(--fgColor-muted)]"
              >
                <Pill tone={ROLE_TONE[r]}>{ROLE_LABELS[r]}</Pill>
              </div>
            ))}
          </div>
          {PERMISSIONS.map((p) => (
            <PermissionCells
              key={p.key}
              label={p.label}
              permission={p.key}
              matrix={matrix}
              isLocked={isLocked}
              canManage={canManage}
              onToggle={toggle}
              pending={pending}
            />
          ))}
        </div>
      </Panel>

      {/* Điện thoại: chọn vai trò rồi bật tắt từng quyền */}
      <PhonePermissions matrix={matrix} canManage={canManage} isLocked={isLocked} onToggle={toggle} pending={pending} />
    </div>
  );
}

function PermissionCells({
  label,
  permission,
  matrix,
  isLocked,
  canManage,
  onToggle,
  pending,
}: {
  label: string;
  permission: Permission;
  matrix: RoleMatrix;
  isLocked: (r: Role, p: Permission) => boolean;
  canManage: boolean;
  onToggle: (r: Role, p: Permission, g: boolean) => void;
  pending: boolean;
}) {
  return (
    <div
      role="row"
      className="grid grid-cols-[minmax(220px,2fr)_repeat(4,minmax(96px,1fr))] border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] transition-colors last:border-b-0 hover:bg-[var(--row-hover)]"
    >
      <div role="cell" className="flex items-center px-4 py-2.5 text-[13.5px] font-medium text-[var(--fgColor-default)]">
        {label}
      </div>
      {ROLE_CODES.map((r) => {
        const granted = matrix[r][permission];
        const locked = isLocked(r, permission) || !canManage;
        return (
          <div key={r} role="cell" className="flex items-center justify-center px-2 py-2.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={granted}
              aria-label={`${label} — ${ROLE_LABELS[r]}`}
              disabled={locked || pending}
              onClick={() => onToggle(r, permission, !granted)}
              className={`grid size-6 place-items-center rounded-[6px] border transition-all disabled:opacity-50 ${
                granted
                  ? 'border-[#16a34a] bg-[#16a34a] text-white shadow-2xs dark:border-[#238636] dark:bg-[#238636]'
                  : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-transparent hover:border-[var(--primary)]'
              }`}
            >
              <CheckIcon size={14} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function PhonePermissions({
  matrix,
  canManage,
  isLocked,
  onToggle,
  pending,
}: {
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
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
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
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3.5 py-2.5 text-left shadow-[var(--shadow)] transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--row-hover)] disabled:opacity-50"
              >
                <span className="text-sm font-medium text-[var(--fgColor-default)]">{p.label}</span>
                <span
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    granted ? 'bg-[#16a34a]' : 'bg-[var(--bgColor-neutral-muted)]'
                  }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-[var(--bgColor-default)] shadow-sm transition-transform ${
                      granted ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
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

const ACTION_META: Record<string, { label: string; tone: Tone }> = {
  create: { label: 'Thêm', tone: 'mint' },
  update: { label: 'Sửa', tone: 'butter' },
  delete: { label: 'Xoá', tone: 'blush' },
  lock: { label: 'Khoá', tone: 'blush' },
  unlock: { label: 'Mở khoá', tone: 'mint' },
  grant: { label: 'Cấp quyền', tone: 'lav' },
  revoke: { label: 'Gỡ quyền', tone: 'butter' },
  seed: { label: 'Nạp dữ liệu', tone: 'stone' },
};

function AuditTab({ audit }: { audit: AuditRow[] }) {
  const meta = (action: string) => ACTION_META[action] ?? { label: action, tone: 'stone' as Tone };

  const cell = (a: AuditRow, key: string) => {
    switch (key) {
      case 'time':
        return (
          <span className="inline-flex items-center whitespace-nowrap rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-[var(--ink-2)]">
            {formatTime(a.createdAt)}
          </span>
        );
      case 'action':
        return <Pill tone={meta(a.action).tone}>{meta(a.action).label}</Pill>;
      case 'summary':
        return (
          <div className="min-w-0 truncate text-[13.5px] text-[var(--fgColor-default)]" title={a.summary}>
            {a.summary}
          </div>
        );
      case 'actor':
        return (
          <div className="flex min-w-0 items-center gap-2">
            <InitialBadge name={a.accountName ?? 'HT'} seed={a.id} />
            <span className="min-w-0 truncate text-[13px] font-medium text-[var(--fgColor-default)]">
              {a.accountName ?? 'Hệ thống'}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const card = (a: AuditRow) => (
    <Card>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <Pill tone={meta(a.action).tone}>{meta(a.action).label}</Pill>
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-medium text-[var(--fgColor-default)]">{a.summary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
              <InitialBadge name={a.accountName ?? 'HT'} seed={a.id} />
              <span>{a.accountName ?? 'Hệ thống'}</span>
            </span>
            <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-2)]">
              {formatTime(a.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Card>
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
      fill
      searchEnable
      title="Nhật ký hoạt động"
      empty={<EmptyPanel title="Chưa có hoạt động nào" />}
    />
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const vn = new Date(d.getTime() + 7 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()} ${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}
