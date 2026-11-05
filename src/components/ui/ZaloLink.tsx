import { CommentIcon } from '@primer/octicons-react';
import { zaloUrl } from '@/lib/zalo';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/btn-classes';

// Nút mở chat Zalo với phụ huynh, đặt cạnh số gọi. Không có số hợp lệ thì không hiện.
// variant "link" dùng trong bảng CRM (nhãn chip xanh Zalo gọn sắc nét), "button" dùng trong thẻ và hồ sơ.
export function ZaloLink({ phone, name, variant = 'button' }: { phone: string; name: string; variant?: 'button' | 'link' }) {
  const href = zaloUrl(phone);
  if (!href) return null;
  if (variant === 'button') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Nhắn Zalo cho ${name}`} className={`${BTN_BASE} ${BTN_GHOST}`}>
        <CommentIcon size={13} aria-hidden />
        <span>Zalo</span>
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-link="true"
      aria-label={`Nhắn Zalo cho ${name}`}
      className="inline-flex shrink-0 items-center gap-1 rounded-[5px] border border-[#0068ff]/25 bg-[#eff6ff] px-1.5 py-0.5 text-[11px] font-semibold text-[#0058d6] no-underline transition-colors hover:border-[#0068ff] hover:bg-[#dbeafe] dark:border-[#1d4ed8] dark:bg-[#172554] dark:text-[#93c5fd] dark:hover:bg-[#1e3a8a]"
    >
      <CommentIcon size={10} aria-hidden />
      <span>Zalo</span>
    </a>
  );
}
