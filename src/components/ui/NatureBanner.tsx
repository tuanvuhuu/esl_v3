import type { ReactNode } from 'react';

// Ảnh nền thiên nhiên nghệ thuật đa lớp (Silk Horizon SVG 1600×900).
// Bảng màu của từng cảnh (Đồi, Rừng, Biển, Núi, Đồng cỏ) là ĐỘC LẬP hoàn toàn với Màu chủ đề (--primary),
// và phần bầu trời phía trên được giữ trong suốt để làm nổi bật hoàn toàn các thẻ trắng của Dashboard.
export type NatureScene = 'hills' | 'forest' | 'sea' | 'mountain' | 'meadow';

const SCENES: NatureScene[] = ['hills', 'forest', 'sea'];

export function natureSceneFor(weekday: number): NatureScene {
  return SCENES[weekday % SCENES.length];
}

interface ScenePalette {
  id: string;
  orbA: string;
  orbB: string;
  orbC: string;
  wave1Start: string;
  wave1Mid: string;
  wave1End: string;
  wave2Top: string;
  wave2Bottom: string;
  wave3Start: string;
  wave3Mid: string;
  wave3End: string;
}

function AmbientDefs({ p }: { p: ScenePalette }) {
  return (
    <defs>
      <radialGradient id={`orb-a-${p.id}`} cx="12%" cy="10%" r="42%">
        <stop offset="0%" stopColor={p.orbA} stopOpacity="0.14" />
        <stop offset="100%" stopColor={p.orbA} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`orb-b-${p.id}`} cx="88%" cy="14%" r="40%">
        <stop offset="0%" stopColor={p.orbB} stopOpacity="0.12" />
        <stop offset="100%" stopColor={p.orbB} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`orb-c-${p.id}`} cx="50%" cy="95%" r="55%">
        <stop offset="0%" stopColor={p.orbC} stopOpacity="0.22" />
        <stop offset="100%" stopColor={p.orbC} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`wave-1-${p.id}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={p.wave1Start} stopOpacity="0.22" />
        <stop offset="50%" stopColor={p.wave1Mid} stopOpacity="0.28" />
        <stop offset="100%" stopColor={p.wave1End} stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id={`wave-2-${p.id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={p.wave2Top} stopOpacity="0.32" />
        <stop offset="100%" stopColor={p.wave2Bottom} stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id={`wave-3-${p.id}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={p.wave3Start} stopOpacity="0.38" />
        <stop offset="50%" stopColor={p.wave3Mid} stopOpacity="0.32" />
        <stop offset="100%" stopColor={p.wave3End} stopOpacity="0.38" />
      </linearGradient>
    </defs>
  );
}

function AmbientBase({ id }: { id: string }) {
  return (
    <>
      <rect width="1600" height="900" fill={`url(#orb-a-${id})`} />
      <rect width="1600" height="900" fill={`url(#orb-b-${id})`} />
      <rect width="1600" height="900" fill={`url(#orb-c-${id})`} />
    </>
  );
}

// 1. Đồi (Hills): Bình minh vàng cam & đồi lụa ấm áp (bảng màu riêng biệt)
const HILLS_PALETTE: ScenePalette = {
  id: 'hills',
  orbA: '#f97316',
  orbB: '#f59e0b',
  orbC: '#ea580c',
  wave1Start: '#fb923c',
  wave1Mid: '#f59e0b',
  wave1End: '#ea580c',
  wave2Top: '#f97316',
  wave2Bottom: '#fdba74',
  wave3Start: '#ea580c',
  wave3Mid: '#d97706',
  wave3End: '#c2410c',
};

const HILLS = (
  <>
    <AmbientDefs p={HILLS_PALETTE} />
    <AmbientBase id="hills" />
    <path
      d="M0 735 C320 655, 620 765, 960 685 C1220 625, 1420 695, 1600 660 L1600 900 L0 900 Z"
      fill="url(#wave-1-hills)"
    />
    <path
      d="M0 780 C280 725, 580 685, 920 755 C1180 805, 1410 725, 1600 745 L1600 900 L0 900 Z"
      fill="url(#wave-2-hills)"
    />
    <path
      d="M0 828 C360 780, 740 855, 1120 800 C1340 770, 1490 805, 1600 790 L1600 900 L0 900 Z"
      fill="url(#wave-3-hills)"
    />
  </>
);

// 2. Rừng (Forest): Nắng sớm xuyên sương & dải lụa ngọc lục bảo (bảng màu riêng biệt)
const FOREST_PALETTE: ScenePalette = {
  id: 'forest',
  orbA: '#10b981',
  orbB: '#34d399',
  orbC: '#059669',
  wave1Start: '#34d399',
  wave1Mid: '#10b981',
  wave1End: '#059669',
  wave2Top: '#10b981',
  wave2Bottom: '#6ee7b7',
  wave3Start: '#059669',
  wave3Mid: '#047857',
  wave3End: '#0d9488',
};

const FOREST = (
  <>
    <AmbientDefs p={FOREST_PALETTE} />
    <AmbientBase id="forest" />
    <path
      d="M0 725 C260 675, 520 755, 820 700 C1120 645, 1360 725, 1600 680 L1600 900 L0 900 Z"
      fill="url(#wave-1-forest)"
    />
    <path
      d="M0 775 C340 725, 680 805, 1020 745 C1280 700, 1460 755, 1600 735 L1600 900 L0 900 Z"
      fill="url(#wave-2-forest)"
    />
    <path
      d="M0 825 C290 790, 640 850, 1010 805 C1290 775, 1470 820, 1600 800 L1600 900 L0 900 Z"
      fill="url(#wave-3-forest)"
    />
  </>
);

// 3. Biển (Sea): Sóng lụa đại dương xanh lam & ngọc bích (bảng màu riêng biệt)
const SEA_PALETTE: ScenePalette = {
  id: 'sea',
  orbA: '#0ea5e9',
  orbB: '#38bdf8',
  orbC: '#0284c7',
  wave1Start: '#38bdf8',
  wave1Mid: '#0ea5e9',
  wave1End: '#06b6d4',
  wave2Top: '#0284c7',
  wave2Bottom: '#7dd3fc',
  wave3Start: '#0369a1',
  wave3Mid: '#0284c7',
  wave3End: '#0e7490',
};

const SEA = (
  <>
    <AmbientDefs p={SEA_PALETTE} />
    <AmbientBase id="sea" />
    <path
      d="M0 735 C240 695, 480 765, 760 725 C1040 685, 1320 755, 1600 715 L1600 900 L0 900 Z"
      fill="url(#wave-1-sea)"
    />
    <path
      d="M0 780 C280 815, 560 740, 860 780 C1140 815, 1380 755, 1600 780 L1600 900 L0 900 Z"
      fill="url(#wave-2-sea)"
    />
    <path
      d="M0 828 C260 800, 540 855, 840 820 C1140 785, 1390 840, 1600 815 L1600 900 L0 900 Z"
      fill="url(#wave-3-sea)"
    />
  </>
);

// 4. Núi (Mountain): Dãy núi mờ sương tím lam cực quang (bảng màu riêng biệt)
const MOUNTAIN_PALETTE: ScenePalette = {
  id: 'mountain',
  orbA: '#8b5cf6',
  orbB: '#6366f1',
  orbC: '#7c3aed',
  wave1Start: '#a78bfa',
  wave1Mid: '#818cf8',
  wave1End: '#6366f1',
  wave2Top: '#7c3aed',
  wave2Bottom: '#c4b5fd',
  wave3Start: '#5b21b6',
  wave3Mid: '#4f46e5',
  wave3End: '#6d28d9',
};

const MOUNTAIN = (
  <>
    <AmbientDefs p={MOUNTAIN_PALETTE} />
    <AmbientBase id="mountain" />
    <path
      d="M0 750 L220 635 L430 715 L690 595 L960 725 L1210 620 L1430 705 L1600 645 L1600 900 L0 900 Z"
      fill="url(#wave-1-mountain)"
    />
    <path
      d="M0 795 L180 715 L410 775 L640 685 L910 790 L1160 700 L1390 775 L1600 725 L1600 900 L0 900 Z"
      fill="url(#wave-2-mountain)"
    />
    <path
      d="M0 835 C380 800, 760 855, 1160 815 C1360 800, 1500 825, 1600 815 L1600 900 L0 900 Z"
      fill="url(#wave-3-mountain)"
    />
  </>
);

// 5. Đồng cỏ (Meadow): Thảo nguyên nắng mai vàng chanh & xanh non (bảng màu riêng biệt)
const MEADOW_PALETTE: ScenePalette = {
  id: 'meadow',
  orbA: '#eab308',
  orbB: '#84cc16',
  orbC: '#16a34a',
  wave1Start: '#a3e635',
  wave1Mid: '#84cc16',
  wave1End: '#22c55e',
  wave2Top: '#65a30d',
  wave2Bottom: '#bef264',
  wave3Start: '#16a34a',
  wave3Mid: '#4d7c0f',
  wave3End: '#15803d',
};

const MEADOW = (
  <>
    <AmbientDefs p={MEADOW_PALETTE} />
    <AmbientBase id="meadow" />
    <path
      d="M0 740 C340 685, 680 765, 1020 710 C1280 670, 1460 725, 1600 700 L1600 900 L0 900 Z"
      fill="url(#wave-1-meadow)"
    />
    <path
      d="M0 785 C300 745, 640 815, 980 765 C1260 720, 1450 775, 1600 760 L1600 900 L0 900 Z"
      fill="url(#wave-2-meadow)"
    />
    <path
      d="M0 830 C360 805, 740 855, 1120 815 C1350 795, 1490 825, 1600 810 L1600 900 L0 900 Z"
      fill="url(#wave-3-meadow)"
    />
  </>
);

const SVG_SCENE: Record<NatureScene, ReactNode> = {
  hills: HILLS,
  forest: FOREST,
  sea: SEA,
  mountain: MOUNTAIN,
  meadow: MEADOW,
};

export const NATURE_SCENES: NatureScene[] = ['hills', 'forest', 'sea', 'mountain', 'meadow'];

export const NATURE_LABEL: Record<NatureScene, string> = {
  hills: 'Đồi',
  forest: 'Rừng',
  sea: 'Biển',
  mountain: 'Núi',
  meadow: 'Đồng cỏ',
};

export function NatureSvg({ scene, slice = 'xMidYMax' }: { scene: NatureScene; slice?: 'xMidYMax' | 'xMidYMid' }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio={`${slice} slice`} className="size-full" focusable="false" aria-hidden>
      {SVG_SCENE[scene]}
    </svg>
  );
}
