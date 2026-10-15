// Điểm kỹ năng dạng nhãn màu theo dải điểm (P26). Màu lấy từ token có sẵn, không viết mã màu cố định.
import { bandOf } from '@/lib/skill-stats';
import { Pill, type Tone } from '@/components/ui/primitives';

const BAND_TONE: Record<ReturnType<typeof bandOf>, Tone> = { good: 'mint', mid: 'butter', low: 'blush', none: 'stone' };

export function SkillScore({ percent }: { percent: number | null }) {
  return <Pill tone={BAND_TONE[bandOf(percent)]}>{percent === null ? '—' : `${percent}%`}</Pill>;
}

// Ô màu của báo cáo lớp: nền theo dải, chữ tương phản
export function skillCellClass(percent: number | null): string {
  const band = bandOf(percent);
  if (band === 'good') return 'bg-mint text-mint-ink';
  if (band === 'mid') return 'bg-butter text-butter-ink';
  if (band === 'low') return 'bg-blush text-blush-ink';
  return 'bg-stone text-stone-ink';
}
