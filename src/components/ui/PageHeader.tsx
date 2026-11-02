'use client';

// Tiêu đề trang dùng PageHeader chính gốc của @primer/react v38 + khai báo đường dẫn cho Breadcrumbs của khung ứng dụng.
import { Label, PageHeader as PrimerPageHeader } from '@primer/react';
import type { ReactNode } from 'react';
import { PageCrumbs } from '@/components/shell/PageCrumbs';

export function PageHeader({
  crumbs,
  title,
  code,
  subtitle,
  actions,
  titleOnTopbar: _legacyTitleOnTopbar,
}: {
  crumbs: string[];
  title: string;
  code?: string;
  subtitle?: string;
  actions?: ReactNode;
  titleOnTopbar?: boolean;
}) {
  void _legacyTitleOnTopbar;
  return (
    <div className="mb-4 max-[767px]:mb-3">
      <PageCrumbs crumbs={crumbs} />
      <PrimerPageHeader role="banner" aria-label={title} hasBorder className="pb-3">
        <PrimerPageHeader.TitleArea variant="medium">
          <PrimerPageHeader.Title as="h1">{title}</PrimerPageHeader.Title>
          {code && (
            <PrimerPageHeader.TrailingVisual>
              <Label variant="secondary" className="font-mono !font-normal">
                {code}
              </Label>
            </PrimerPageHeader.TrailingVisual>
          )}
        </PrimerPageHeader.TitleArea>
        {actions && (
          <PrimerPageHeader.Actions>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </PrimerPageHeader.Actions>
        )}
        {subtitle && (
          <PrimerPageHeader.Description>
            <span className="text-sm text-[var(--fgColor-muted)]">{subtitle}</span>
          </PrimerPageHeader.Description>
        )}
      </PrimerPageHeader>
    </div>
  );
}
