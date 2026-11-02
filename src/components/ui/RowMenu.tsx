'use client';

import { KebabHorizontalIcon } from '@primer/octicons-react';
import { ActionList, ActionMenu, IconButton } from '@primer/react';
import Link from 'next/link';
import type { ElementType } from 'react';

export type RowMenuItem =
  | { kind: 'link'; href: string; label: string; icon: ElementType }
  | {
      kind: 'action';
      label: string;
      icon: ElementType;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      disabledHint?: string;
    };

// Nút ⋯ mở ActionMenu của @primer/react v38. Tương thích cả Octicons lẫn LucideIcon trong quá trình chuyển đổi.
export function RowMenu({ items, label }: { items: RowMenuItem[]; label: string }) {
  return (
    <div data-act="true" className="more-btn relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <ActionMenu>
        <ActionMenu.Anchor>
          <IconButton
            icon={KebabHorizontalIcon}
            aria-label={label}
            title={label}
            variant="default"
            unsafeDisableTooltip
            className="!size-[var(--icon-h)] max-[767px]:!size-[var(--icon-h-touch)]"
          />
        </ActionMenu.Anchor>
        <ActionMenu.Overlay align="end" width="small" className="row-menu">
          <ActionList aria-label={label}>
            {items.map((item) => {
              const Icon = item.icon;
              if (item.kind === 'link') {
                return (
                  <ActionList.LinkItem key={item.label} as={Link} href={item.href}>
                    <ActionList.LeadingVisual>
                      <Icon className="size-4" aria-hidden />
                    </ActionList.LeadingVisual>
                    {item.label}
                  </ActionList.LinkItem>
                );
              }
              return (
                <ActionList.Item
                  key={item.label}
                  variant={item.danger ? 'danger' : 'default'}
                  disabled={item.disabled}
                  title={item.disabled ? item.disabledHint : undefined}
                  onSelect={() => item.onSelect()}
                >
                  <ActionList.LeadingVisual>
                    <Icon className="size-4" aria-hidden />
                  </ActionList.LeadingVisual>
                  {item.label}
                </ActionList.Item>
              );
            })}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </div>
  );
}
