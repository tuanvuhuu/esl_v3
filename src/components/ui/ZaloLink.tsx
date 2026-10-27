import { zaloUrl } from '@/lib/zalo';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';

// Nút mở chat Zalo với phụ huynh, đặt cạnh số gọi. Không có số hợp lệ thì không hiện.
// variant "link" dùng trong bảng (chữ xanh gạch chân), "button" dùng trong thẻ và hồ sơ.
export function ZaloLink({ phone, name, variant = 'button' }: { phone: string; name: string; variant?: 'button' | 'link' }) {
  const href = zaloUrl(phone);
  if (!href) return null;
  const cls = variant === 'button' ? `${BTN_BASE} ${BTN_GHOST}` : 'text-sm font-normal text-link underline underline-offset-2';
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Nhắn Zalo cho ${name}`} className={cls}>
      Zalo
    </a>
  );
}
