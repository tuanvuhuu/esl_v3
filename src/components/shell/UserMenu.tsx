'use client';

import { GearIcon, IdBadgeIcon, KeyIcon, SignOutIcon } from '@primer/octicons-react';
import { ActionList, ActionMenu } from '@primer/react';
import Link from 'next/link';
import { useRef } from 'react';
import UserAvatar from '@/components-ui/user-avatar';

export function UserMenu({
  name,
  email,
  role,
  canSettings,
}: {
  name: string;
  email: string;
  role: string;
  canSettings: boolean;
}) {
  const logoutFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="relative shrink-0">
      <form ref={logoutFormRef} method="post" action="/logout" className="hidden" />
      <ActionMenu>
        <ActionMenu.Anchor>
          <button
            type="button"
            aria-label="Tài khoản"
            className="inline-flex size-[var(--icon-h)] items-center justify-center rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-outlineColor)] max-[767px]:size-[var(--icon-h-touch)]"
          >
            <UserAvatar fullName={name} size="medium" />
          </button>
        </ActionMenu.Anchor>
        <ActionMenu.Overlay align="end" width="medium">
          <div className="flex items-center gap-3 border-b border-[var(--borderColor-muted)] px-3.5 py-3">
            <UserAvatar fullName={name} size="large" />
            <div className="min-w-0">
              <b className="block truncate text-sm font-bold text-[var(--fgColor-default)]">{name}</b>
              <small className="block truncate text-xs text-[var(--fgColor-muted)]">
                {email} · {role}
              </small>
            </div>
          </div>
          <ActionList aria-label="Tài khoản">
            <ActionList.Item disabled>
              <ActionList.LeadingVisual>
                <IdBadgeIcon size={16} aria-hidden />
              </ActionList.LeadingVisual>
              Hồ sơ cá nhân (sắp có)
            </ActionList.Item>
            {canSettings && (
              <ActionList.LinkItem as={Link} href="/cai-dat">
                <ActionList.LeadingVisual>
                  <GearIcon size={16} aria-hidden />
                </ActionList.LeadingVisual>
                Cài đặt hệ thống
              </ActionList.LinkItem>
            )}
            <ActionList.LinkItem as={Link} href="/doi-mat-khau">
              <ActionList.LeadingVisual>
                <KeyIcon size={16} aria-hidden />
              </ActionList.LeadingVisual>
              Đổi mật khẩu
            </ActionList.LinkItem>
            <ActionList.Divider />
            <ActionList.Item variant="danger" onSelect={() => logoutFormRef.current?.requestSubmit()}>
              <ActionList.LeadingVisual>
                <SignOutIcon size={16} aria-hidden />
              </ActionList.LeadingVisual>
              Đăng xuất
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </div>
  );
}
