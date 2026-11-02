'use client';

// Bảng danh sách toàn bộ tính năng trên điện thoại dùng Dialog (position="bottom") + ActionList của @primer/react v38.
import { XIcon } from '@primer/octicons-react';
import { ActionList, CounterLabel, Dialog, IconButton } from '@primer/react';
import Link from 'next/link';
import type { NavGroup } from '@/lib/nav';
import { NAV_ICONS } from './nav-icons';

export function FeatureSheet({
  open,
  groups,
  badges,
  onClose,
}: {
  open: boolean;
  groups: NavGroup[];
  badges: Record<string, number>;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <Dialog
      title="Tính năng"
      width="large"
      position={{ narrow: 'bottom', regular: 'bottom' }}
      onClose={() => onClose()}
      renderHeader={() => (
        <Dialog.Header>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Dialog.Title>Tính năng</Dialog.Title>
              <Link
                href="/tinh-nang"
                onClick={onClose}
                className="text-xs font-semibold text-[var(--fgColor-link)] hover:underline"
              >
                Xem dạng lưới
              </Link>
            </div>
            <IconButton
              icon={XIcon}
              variant="invisible"
              unsafeDisableTooltip
              onClick={onClose}
              aria-label="Đóng"
            />
          </div>
        </Dialog.Header>
      )}
    >
      <ActionList showDividers>
        {groups.map((group, idx) => (
          <ActionList.Group key={group.id}>
            {idx > 0 && <ActionList.Divider />}
            <ActionList.GroupHeading>{group.title}</ActionList.GroupHeading>
            {group.items.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const count = badges[item.href] ?? 0;
              return (
                <ActionList.LinkItem key={item.href} as={Link} href={item.href} onClick={onClose}>
                  <ActionList.LeadingVisual>
                    <Icon size={16} />
                  </ActionList.LeadingVisual>
                  {item.label}
                  {count > 0 && (
                    <ActionList.TrailingVisual>
                      <CounterLabel scheme="primary">{count > 99 ? '99+' : count}</CounterLabel>
                    </ActionList.TrailingVisual>
                  )}
                </ActionList.LinkItem>
              );
            })}
          </ActionList.Group>
        ))}
      </ActionList>
    </Dialog>
  );
}
