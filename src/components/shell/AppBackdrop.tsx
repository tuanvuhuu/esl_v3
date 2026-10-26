'use client';

import { NATURE_SCENES, NatureSvg, natureSceneFor, type NatureScene } from '@/components/ui/NatureBanner';
import { useLocalStorage } from '@/lib/use-local-storage';

// Lựa chọn ảnh nền lưu trong trình duyệt: "auto" (theo ngày), một cảnh mặc định, "custom" (ảnh tải lên), "none" (không ảnh).
// Ảnh tải lên (đã thu nhỏ, dạng JPEG) lưu ở khoá riêng.
export const BG_KEY = 'esl-bg';
export const BG_CUSTOM_KEY = 'esl-bg-custom';

// Nền phủ cả khung nhìn, dưới mọi khung và thanh bên (thanh bên bán trong suốt để nhìn thấy nền).
export function AppBackdrop() {
  const [bg] = useLocalStorage(BG_KEY, 'auto');
  const [custom] = useLocalStorage(BG_CUSTOM_KEY, '');
  if (bg === 'none') return null;

  const frame = 'pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-40';
  if (bg === 'custom') {
    if (!custom) return null;
    return <div aria-hidden className={frame} style={{ backgroundImage: `url("${custom}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />;
  }

  const scene: NatureScene = (NATURE_SCENES as string[]).includes(bg) ? (bg as NatureScene) : natureSceneFor(new Date().getDay());
  return (
    <div aria-hidden className={frame}>
      <NatureSvg scene={scene} />
    </div>
  );
}
