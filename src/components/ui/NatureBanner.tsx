import type { CSSProperties } from 'react';

// Ảnh thiên nhiên minh hoạ, vẽ bằng SVG. Màu lấy từ token nên đổi theo màu nhấn và chế độ tối.
// Chỉ để trang trí: ẩn với trình đọc màn hình.
export type NatureScene = 'hills' | 'forest' | 'sea';

const SCENES: NatureScene[] = ['hills', 'forest', 'sea'];

// Mỗi thứ trong tuần một cảnh, nên dải ảnh đổi dần theo ngày
export function natureSceneFor(weekday: number): NatureScene {
  return SCENES[weekday % SCENES.length];
}

const fill = (color: string, opacity = 1): CSSProperties => ({ fill: color, opacity });

// Tam giác cây: đỉnh ở top, đáy ở base, nửa độ rộng w
const tree = (x: number, top: number, base: number, w: number) => `M${x - w} ${base} L${x} ${top} L${x + w} ${base}Z`;

const HILLS = (
  <>
    <circle cx="980" cy="62" r="34" style={fill('var(--primary)')} />
    <path d="M0 150 Q200 88 420 138 T860 128 T1200 118 V240 H0Z" style={fill('var(--mint)')} />
    <path d="M0 186 Q260 128 520 176 T1000 160 T1200 168 V240 H0Z" style={fill('var(--accent)', 0.6)} />
    <path d="M0 214 Q300 176 640 208 T1200 198 V240 H0Z" style={fill('var(--mint-ink)', 0.35)} />
    <path d={[tree(150, 178, 214, 18), tree(196, 190, 216, 16), tree(980, 150, 190, 20)].join(' ')} style={fill('var(--mint-ink)')} />
  </>
);

const FOREST = (
  <>
    {[60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140].map((x, i) => (
      <path key={`back-${x}`} d={tree(x, 96 + (i % 3) * 14, 206, 46)} style={fill('var(--lav-ink)', 0.4)} />
    ))}
    <rect x="0" y="200" width="1200" height="40" style={fill('var(--mint-ink)', 0.3)} />
    {[120, 300, 500, 700, 880, 1080].map((x, i) => (
      <path key={`front-${x}`} d={tree(x, 118 + (i % 2) * 22, 232, 34)} style={fill('var(--accent)', 0.75)} />
    ))}
  </>
);

const SEA = (
  <>
    <circle cx="300" cy="120" r="42" style={fill('var(--primary)')} />
    <g style={fill('var(--surface)', 0.85)}>
      <ellipse cx="760" cy="70" rx="72" ry="18" />
      <ellipse cx="800" cy="56" rx="40" ry="20" />
      <ellipse cx="1040" cy="92" rx="56" ry="14" />
    </g>
    <rect x="0" y="160" width="1200" height="80" style={fill('var(--accent)', 0.55)} />
    <path d={`M0 178 q60 -12 120 0${' t120 0'.repeat(9)}`} style={{ fill: 'none', stroke: 'var(--surface)', strokeWidth: 3, opacity: 0.7 }} />
    <path d={`M0 206 q60 -12 120 0${' t120 0'.repeat(9)}`} style={{ fill: 'none', stroke: 'var(--surface)', strokeWidth: 3, opacity: 0.5 }} />
  </>
);

const SVG_SCENE: Record<NatureScene, React.ReactNode> = { hills: HILLS, forest: FOREST, sea: SEA };

export function NatureBanner({ scene }: { scene: NatureScene }) {
  return (
    <div aria-hidden className="relative h-24 overflow-hidden rounded-[var(--radius-panel)] bg-primary-soft min-[768px]:h-56">
      <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" focusable="false">
        {SVG_SCENE[scene]}
      </svg>
    </div>
  );
}
