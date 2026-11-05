// Điểm kỹ năng dạng nhãn màu theo dải điểm (P26). Màu lấy từ token có sẵn, không viết mã màu cố định.
import { bandOf } from '@/lib/skill-stats';
import { Pill, type Tone } from '@/components/ui/primitives';

const BAND_TONE: Record<ReturnType<typeof bandOf>, Tone> = { good: 'mint', mid: 'butter', low: 'blush', none: 'stone' };

export function SkillScore({ percent }: { percent: number | null }) {
  return <Pill tone={BAND_TONE[bandOf(percent)]}>{percent === null ? '—' : `${percent}%`}</Pill>;
}

// Ô màu của báo cáo lớp: nền theo dải, chữ tương phản sắc nét
export function skillCellClass(percent: number | null): string {
  const band = bandOf(percent);
  if (band === 'good') return 'bg-mint text-mint-ink ring-1 ring-inset ring-[#16a34a]/25 font-medium';
  if (band === 'mid') return 'bg-butter text-butter-ink ring-1 ring-inset ring-[#d97706]/25 font-medium';
  if (band === 'low') return 'bg-blush text-blush-ink ring-1 ring-inset ring-[#dc2626]/25 font-medium';
  return 'bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] ring-1 ring-inset ring-[var(--borderColor-default)]';
}
