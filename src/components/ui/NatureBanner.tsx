import type { CSSProperties, ReactNode } from 'react';

// Ảnh thiên nhiên minh hoạ, vẽ bằng SVG. Màu lấy từ token nên đổi theo màu nhấn và chế độ tối.
// Chỉ để trang trí: ẩn với trình đọc màn hình.
export type NatureScene = 'hills' | 'forest' | 'sea' | 'mountain' | 'meadow';

const SCENES: NatureScene[] = ['hills', 'forest', 'sea'];

// Mỗi thứ trong tuần một cảnh, nên dải ảnh đổi dần theo ngày
export function natureSceneFor(weekday: number): NatureScene {
  return SCENES[weekday % SCENES.length];
}

const fill = (color: string, opacity = 1): CSSProperties => ({ fill: color, opacity });
const line = (color: string, width: number, opacity = 1): CSSProperties => ({ fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', opacity });

// Cây thông ba tầng: đỉnh ở (x, base - h), gốc ở base
function pine(x: number, base: number, h: number) {
  const t = (top: number, bottom: number, w: number) => `M${x} ${top} L${x + w} ${bottom} L${x - w} ${bottom}Z`;
  return `${t(base - h, base - h * 0.62, h * 0.2)} ${t(base - h * 0.8, base - h * 0.3, h * 0.3)} ${t(base - h * 0.45, base - h * 0.02, h * 0.38)} M${x - 2} ${base} h4 v${h * 0.08} h-4Z`;
}

// Mây: các cụm tròn nối nhau
const cloud = (x: number, y: number, s = 1) =>
  `M${x} ${y} q${10 * s} ${-18 * s} ${34 * s} ${-8 * s} q${12 * s} ${-16 * s} ${30 * s} ${-2 * s} q${18 * s} ${-4 * s} ${20 * s} ${12 * s}Z`;

// Gradient bầu trời: từ nền sáng ở trên xuống màu nhạt hơn ở đường chân trời
function Sky({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style={{ stopColor: from }} />
      <stop offset="1" style={{ stopColor: to }} />
    </linearGradient>
  );
}

const HILLS = (
  <>
    <defs>
      <Sky id="sky-hills" from="var(--surface)" to="var(--primary-soft)" />
      <linearGradient id="hill-back" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--mint)' }} />
        <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
      </linearGradient>
    </defs>
    <rect width="1200" height="240" style={{ fill: 'url(#sky-hills)' }} />
    <circle cx="960" cy="58" r="74" style={fill('var(--primary)', 0.18)} />
    <circle cx="960" cy="58" r="38" style={fill('var(--primary)')} />
    <g style={fill('var(--surface)', 0.9)}>
      <path d={cloud(170, 62, 1.1)} />
      <path d={cloud(560, 40, 0.8)} />
      <path d={cloud(760, 92, 0.65)} />
    </g>
    <path d="M0 150 L90 104 L170 138 L270 82 L380 140 L470 110 L560 150 Z" style={fill('var(--lav-ink)', 0.22)} />
    <path d="M0 150 Q200 92 420 140 T860 130 T1200 120 V240 H0Z" style={{ fill: 'url(#hill-back)', opacity: 0.85 }} />
    <path d="M560 240 Q630 196 720 206 T920 190" style={line('var(--surface)', 9, 0.55)} />
    <path d="M0 190 Q260 130 520 178 T1000 162 T1200 170 V240 H0Z" style={fill('var(--accent)', 0.6)} />
    <path d="M0 216 Q300 178 640 210 T1200 200 V240 H0Z" style={fill('var(--mint-ink)', 0.4)} />
    <path d={pine(140, 216, 46) + ' ' + pine(192, 218, 34) + ' ' + pine(236, 214, 28)} style={fill('var(--mint-ink)')} />
    <path d={pine(1010, 180, 44) + ' ' + pine(1050, 184, 30)} style={fill('var(--mint-ink)', 0.9)} />
    <path d="M600 52 q7 -7 14 0 q7 -7 14 0 M640 40 q5 -5 10 0 q5 -5 10 0" style={line('var(--ink)', 2, 0.45)} />
  </>
);

const FOREST = (
  <>
    <defs>
      <Sky id="sky-forest" from="var(--primary-soft)" to="var(--lav)" />
      <linearGradient id="forest-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--mint-ink)' }} />
        <stop offset="1" style={{ stopColor: 'var(--lav-ink)' }} />
      </linearGradient>
    </defs>
    <rect width="1200" height="240" style={{ fill: 'url(#sky-forest)' }} />
    {/* Tia nắng xiên từ trên xuống */}
    <path d="M860 0 L960 0 L780 240 L640 240Z" style={fill('var(--surface)', 0.14)} />
    <path d="M1000 0 L1040 0 L900 240 L840 240Z" style={fill('var(--surface)', 0.1)} />
    <path d={[60, 190, 320, 450, 580, 710, 840, 970, 1100].map((x, i) => pine(x, 210, 120 + (i % 3) * 14)).join(' ')} style={fill('var(--lav-ink)', 0.35)} />
    <path d={[120, 380, 640, 900, 1150].map((x, i) => pine(x, 214, 130 + (i % 2) * 18)).join(' ')} style={fill('var(--accent)', 0.5)} />
    <rect x="0" y="196" width="1200" height="44" style={{ fill: 'url(#forest-floor)', opacity: 0.45 }} />
    <path d={[220, 520, 780, 1040].map((x, i) => pine(x, 226, 118 + i * 6)).join(' ')} style={fill('var(--mint-ink)', 0.85)} />
    <ellipse cx="300" cy="230" rx="90" ry="14" style={fill('var(--mint-ink)', 0.5)} />
    <ellipse cx="880" cy="234" rx="120" ry="16" style={fill('var(--mint-ink)', 0.5)} />
  </>
);

const SEA = (
  <>
    <defs>
      <Sky id="sky-sea" from="var(--surface)" to="var(--primary-soft)" />
      <linearGradient id="sea-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
        <stop offset="1" style={{ stopColor: 'var(--mint-ink)' }} />
      </linearGradient>
    </defs>
    <rect width="1200" height="240" style={{ fill: 'url(#sky-sea)' }} />
    <circle cx="380" cy="142" r="92" style={fill('var(--primary)', 0.16)} />
    <circle cx="380" cy="142" r="46" style={fill('var(--primary)')} />
    <g style={fill('var(--surface)', 0.9)}>
      <path d={cloud(640, 56, 1.2)} />
      <path d={cloud(900, 34, 0.9)} />
    </g>
    <rect x="0" y="150" width="1200" height="90" style={{ fill: 'url(#sea-water)', opacity: 0.7 }} />
    {/* Đảo nhỏ bên trái */}
    <path d="M0 150 Q60 128 140 150 Z" style={fill('var(--mint-ink)', 0.55)} />
    {/* Phản chiếu mặt trời trên mặt biển */}
    <g style={fill('var(--primary)', 0.45)}>
      <rect x="340" y="160" width="80" height="4" rx="2" />
      <rect x="360" y="172" width="44" height="3" rx="1.5" />
      <rect x="372" y="184" width="22" height="3" rx="1.5" />
    </g>
    {/* Thuyền buồm */}
    <g>
      <path d="M760 150 L760 92 L800 146Z" style={fill('var(--surface)', 0.95)} />
      <path d="M752 150 L752 112 L726 146Z" style={fill('var(--primary)', 0.9)} />
      <path d="M718 152 L820 152 L808 164 L730 164Z" style={fill('var(--blush-ink)', 0.85)} />
    </g>
    <path d="M0 176 q60 -12 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" style={line('var(--surface)', 3, 0.65)} />
    <path d="M0 206 q60 -12 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" style={line('var(--surface)', 3, 0.45)} />
    <path d="M0 228 q60 -10 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" style={line('var(--surface)', 2, 0.3)} />
  </>
);

const MOUNTAIN = (
  <>
    <defs>
      <Sky id="sky-mountain" from="var(--surface)" to="var(--lav)" />
    </defs>
    <rect width="1200" height="240" style={{ fill: 'url(#sky-mountain)' }} />
    <g style={fill('var(--surface)', 0.85)}>
      <path d={cloud(120, 40, 0.9)} />
      <path d={cloud(900, 28, 1)} />
    </g>
    <path d="M0 170 L150 60 L260 130 L380 40 L520 140 L640 70 L780 150 L900 50 L1040 130 L1200 70 V240 H0Z" style={fill('var(--lav-ink)', 0.3)} />
    <path d="M150 60 L168 92 L132 92Z M380 40 L404 80 L356 80Z M900 50 L922 84 L878 84Z M1200 70 L1176 98 L1200 98Z" style={fill('var(--surface)', 0.9)} />
    <path d="M0 200 L120 120 L240 180 L400 100 L560 190 L720 130 L900 200 L1060 115 L1200 180 V240 H0Z" style={fill('var(--mint-ink)', 0.45)} />
    <rect x="0" y="196" width="1200" height="44" style={fill('var(--accent)', 0.5)} />
    <path d="M200 214 L400 214 M600 222 L800 222 M300 230 L480 230" style={line('var(--surface)', 2, 0.35)} />
    <path d={pine(180, 214, 40) + ' ' + pine(230, 218, 30) + ' ' + pine(980, 212, 44)} style={fill('var(--mint-ink)')} />
  </>
);

// Đồng cỏ: mặt trời, đồi xanh nhiều lớp, cây tròn và hoa dại
const MEADOW = (
  <>
    <defs>
      <Sky id="sky-meadow" from="var(--primary-soft)" to="var(--surface)" />
    </defs>
    <rect width="1200" height="240" style={{ fill: 'url(#sky-meadow)' }} />
    <circle cx="240" cy="66" r="58" style={fill('var(--primary)', 0.18)} />
    <circle cx="240" cy="66" r="32" style={fill('var(--primary)')} />
    <path d="M0 150 Q240 118 480 150 T960 138 T1200 150 V240 H0Z" style={fill('var(--mint)')} />
    <path d="M0 184 Q320 150 640 180 T1200 176 V240 H0Z" style={fill('var(--accent)', 0.55)} />
    <path d="M520 240 Q600 200 700 206 T900 240" style={line('var(--surface)', 6, 0.5)} />
    <path d="M0 214 Q300 188 620 210 T1200 206 V240 H0Z" style={fill('var(--mint-ink)', 0.35)} />
    {[860, 1010].map((x, i) => (
      <g key={`tree-${x}`}>
        <rect x={x - 3} y={170 + i * 4} width="6" height="22" style={fill('var(--mint-ink)')} />
        <circle cx={x} cy={160 + i * 4} r={22 - i * 3} style={fill('var(--accent)')} />
      </g>
    ))}
    {[120, 180, 300, 360, 430, 560, 700, 780, 1080, 1140].map((x, i) => (
      <circle key={`flower-${x}`} cx={x} cy={204 + (i % 4) * 8} r={3.5} style={fill(i % 3 === 0 ? 'var(--blush-ink)' : i % 3 === 1 ? 'var(--butter-ink)' : 'var(--surface)', 0.9)} />
    ))}
  </>
);

const SVG_SCENE: Record<NatureScene, ReactNode> = { hills: HILLS, forest: FOREST, sea: SEA, mountain: MOUNTAIN, meadow: MEADOW };

// Năm cảnh mặc định cho ảnh nền, theo thứ tự hiện trong menu
export const NATURE_SCENES: NatureScene[] = ['hills', 'forest', 'sea', 'mountain', 'meadow'];

export const NATURE_LABEL: Record<NatureScene, string> = {
  hills: 'Đồi',
  forest: 'Rừng',
  sea: 'Biển',
  mountain: 'Núi',
  meadow: 'Đồng cỏ',
};

// Hình cảnh (không kèm khung). Dùng cho nền phủ cả khu nội dung và cho ảnh thu nhỏ trong menu.
export function NatureSvg({ scene, slice = 'xMidYMax' }: { scene: NatureScene; slice?: 'xMidYMax' | 'xMidYMid' }) {
  return (
    <svg viewBox="0 0 1200 240" preserveAspectRatio={`${slice} slice`} className="size-full" focusable="false" aria-hidden>
      {SVG_SCENE[scene]}
    </svg>
  );
}
