'use client';

import { NATURE_SCENES, NatureSvg, natureSceneFor, type NatureScene } from '@/components/ui/NatureBanner';
import { useLocalStorage } from '@/lib/use-local-storage';

// Lựa chọn ảnh nền lưu trong trình duyệt: "auto" (theo ngày), một cảnh mặc định, "custom" (ảnh tải lên), "none" (không ảnh).
// Ảnh tải lên (đã thu nhỏ, dạng JPEG) lưu ở khoá riêng.
export const BG_KEY = 'esl-bg';
export const BG_CUSTOM_KEY = 'esl-bg-custom';

// Dải phong cảnh ở đáy khung nhìn, mờ dần lên trên; nằm dưới khung trắng, không phủ thanh trên và thanh bên.
export function AppBackdrop() {
  const [bg] = useLocalStorage(BG_KEY, 'auto');
  const [custom] = useLocalStorage(BG_CUSTOM_KEY, '');
  if (bg === 'none') return null;

  const frame = 'pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[42vh] overflow-hidden opacity-50 [mask-image:linear-gradient(to_top,black_60%,transparent)] min-[768px]:h-[38vh] min-[1200px]:left-[208px]';
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
