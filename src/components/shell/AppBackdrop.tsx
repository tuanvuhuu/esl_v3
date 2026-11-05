'use client';

import { NATURE_SCENES, NatureSvg, natureSceneFor, type NatureScene } from '@/components/ui/NatureBanner';
import { useLocalStorage } from '@/lib/use-local-storage';

// Lựa chọn ảnh nền lưu trong trình duyệt, hoàn toàn tách biệt với Màu chủ đề (data-accent):
// - Khi chọn "none", trả về null (nền chuẩn trung tính, không bị nhuộm theo màu chủ đề).
// - Khi chọn cảnh thiên nhiên / ảnh riêng, hiển thị đúng bảng màu riêng của cảnh đó.
export const BG_KEY = 'esl-primer-bg';
export const BG_CUSTOM_KEY = 'esl-bg-custom';

export function AppBackdrop() {
  const [bg] = useLocalStorage(BG_KEY, 'none');
  const [custom] = useLocalStorage(BG_CUSTOM_KEY, '');

  if (bg === 'none') return null;

  const frame = 'pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-90 dark:opacity-35';
  if (bg === 'custom') {
    if (!custom) return null;
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-45 dark:opacity-35"
        style={{ backgroundImage: `url("${custom}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
    );
  }

  const scene: NatureScene = (NATURE_SCENES as string[]).includes(bg) ? (bg as NatureScene) : natureSceneFor(new Date().getDay());
  return (
    <div aria-hidden className={frame}>
      <NatureSvg scene={scene} />
    </div>
  );
}
