'use client';

// Menu tài khoản người dùng trên nền ActionMenu + ActionList của @primer/react v38 + Octicons.
import { GearIcon, IdBadgeIcon, KeyIcon, PaperAirplaneIcon, PersonIcon, SignOutIcon } from '@primer/octicons-react';
import { ActionList, ActionMenu, IconButton } from '@primer/react';
import Link from 'next/link';
import { useRef } from 'react';

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
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative shrink-0">
      <form ref={logoutFormRef} method="post" action="/logout" className="hidden" />
      <ActionMenu>
        <ActionMenu.Anchor>
          <IconButton
            icon={PersonIcon}
            variant="default"
            unsafeDisableTooltip
            aria-label="Tài khoản"
            className="!size-[var(--icon-h)] max-[767px]:!size-[var(--icon-h-touch)]"
          />
        </ActionMenu.Anchor>
        <ActionMenu.Overlay align="end" width="medium">
          <div className="flex items-center gap-3 border-b border-[var(--borderColor-muted)] px-3.5 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--bgColor-accent-muted)] text-sm font-bold text-[var(--fgColor-accent)]">
              {initials}
            </span>
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
                Cài đặt
              </ActionList.LinkItem>
            )}
            <ActionList.LinkItem as={Link} href="/doi-mat-khau">
              <ActionList.LeadingVisual>
                <KeyIcon size={16} aria-hidden />
              </ActionList.LeadingVisual>
              Đổi mật khẩu
            </ActionList.LinkItem>
            <ActionList.LinkItem as={Link} href="/tin-nhan">
              <ActionList.LeadingVisual>
                <PaperAirplaneIcon size={16} aria-hidden />
              </ActionList.LeadingVisual>
              Kết nối Telegram
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
