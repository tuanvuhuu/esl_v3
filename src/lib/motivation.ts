// Động lực học (35.17): sao theo bài, sticker và truyện mở khoá bằng sao, chuỗi học theo tuần, mục tiêu chung của lớp.
// Không trừ sao khi sai: sao chỉ cộng thêm. Không xếp hạng cá nhân. Logic thuần, không đụng DB.
import { addDaysKey } from '@/lib/datetime';
import { starsFor } from '@/lib/recording';

// Sao của một bài: chưa nộp 0; nộp chờ chấm 1 (chấm xong thì cập nhật); đã chấm 1–3 theo điểm (cùng ngưỡng màn chúc mừng)
export function assignmentStars(status: 'not_submitted' | 'submitted' | 'graded', score: number | null, maxScore: number): 0 | 1 | 2 | 3 {
  if (status === 'not_submitted') return 0;
  if (status === 'submitted' || score === null) return 1;
  return starsFor(score, maxScore);
}

// ---------- Sticker: 12 hình, cứ thêm 5 sao mở một hình ----------
export const STICKERS = [
  { emoji: '🐣', name: 'Gà con' },
  { emoji: '🦊', name: 'Cáo nhỏ' },
  { emoji: '🐼', name: 'Gấu trúc' },
  { emoji: '🦁', name: 'Sư tử' },
  { emoji: '🐬', name: 'Cá heo' },
  { emoji: '🦄', name: 'Kỳ lân' },
  { emoji: '🚀', name: 'Tên lửa' },
  { emoji: '🌈', name: 'Cầu vồng' },
  { emoji: '🏰', name: 'Lâu đài' },
  { emoji: '🐉', name: 'Rồng' },
  { emoji: '🪐', name: 'Hành tinh' },
  { emoji: '👑', name: 'Vương miện' },
] as const;
export const STARS_PER_STICKER = 5;

export function stickerBook(totalStars: number): { emoji: string; name: string; need: number; unlocked: boolean }[] {
  return STICKERS.map((s, i) => {
    const need = (i + 1) * STARS_PER_STICKER;
    return { ...s, need, unlocked: totalStars >= need };
  });
}

// ---------- Truyện ngắn mở khoá bằng sao (truyện tự viết, câu tiếng Anh đơn giản kèm nghĩa) ----------
export type Story = { slug: string; title: string; emoji: string; need: number; lines: { en: string; vi: string }[] };
export const STORIES: Story[] = [
  {
    slug: 'little-cat',
    title: 'The Little Cat',
    emoji: '🐱',
    need: 10,
    lines: [
      { en: 'This is Mimi. Mimi is a little cat.', vi: 'Đây là Mimi. Mimi là một chú mèo nhỏ.' },
      { en: 'Mimi likes milk. She does not like rain.', vi: 'Mimi thích sữa. Mimi không thích mưa.' },
      { en: 'It rains today. Mimi sits by the window.', vi: 'Hôm nay trời mưa. Mimi ngồi bên cửa sổ.' },
      { en: 'Then the sun comes out. Mimi runs and jumps!', vi: 'Rồi mặt trời ló ra. Mimi chạy và nhảy!' },
    ],
  },
  {
    slug: 'red-balloon',
    title: 'The Red Balloon',
    emoji: '🎈',
    need: 25,
    lines: [
      { en: 'Nam has a red balloon.', vi: 'Nam có một quả bóng bay màu đỏ.' },
      { en: 'The wind blows. The balloon goes up, up, up.', vi: 'Gió thổi. Quả bóng bay lên, lên, lên cao.' },
      { en: 'A bird sees the balloon. "Hello!" says the bird.', vi: 'Một chú chim thấy quả bóng. Chim nói: "Xin chào!"' },
      { en: 'The bird brings the balloon back. Nam is happy.', vi: 'Chú chim mang quả bóng về. Nam rất vui.' },
    ],
  },
  {
    slug: 'big-tree',
    title: 'The Big Tree',
    emoji: '🌳',
    need: 45,
    lines: [
      { en: 'There is a big tree in the park.', vi: 'Có một cái cây to trong công viên.' },
      { en: 'Birds live in the tree. Children play under it.', vi: 'Chim sống trên cây. Trẻ em chơi dưới gốc cây.' },
      { en: 'In summer, the tree gives cool shade.', vi: 'Mùa hè, cây cho bóng mát.' },
      { en: '"Thank you, big tree!" say the children.', vi: 'Các bạn nhỏ nói: "Cảm ơn cây to!"' },
    ],
  },
  {
    slug: 'moon-trip',
    title: 'A Trip to the Moon',
    emoji: '🌙',
    need: 70,
    lines: [
      { en: 'Lan builds a rocket from a big box.', vi: 'Lan làm một tên lửa từ chiếc hộp to.' },
      { en: 'Three, two, one... go! Lan flies to the moon.', vi: 'Ba, hai, một... bay! Lan bay lên mặt trăng.' },
      { en: 'The moon is quiet. Lan can see the Earth. It is blue and green.', vi: 'Mặt trăng thật yên tĩnh. Lan nhìn thấy Trái Đất màu xanh dương và xanh lá.' },
      { en: 'Mum calls, "Dinner time!" Lan flies home.', vi: 'Mẹ gọi: "Đến giờ ăn tối rồi!" Lan bay về nhà.' },
    ],
  },
];

// ---------- Chuỗi học theo tuần (thứ Hai đến Chủ nhật, giờ Việt Nam) ----------
// Tuần có học = có nộp bài hoặc chơi xong một trò. Tuần này chưa học thì chưa mất chuỗi: đếm từ tuần trước lùi lại.
export function weeklyStreak(activeWeeks: string[], currentWeek: string): { weeks: number; activeThisWeek: boolean } {
  const set = new Set(activeWeeks);
  const activeThisWeek = set.has(currentWeek);
  let week = activeThisWeek ? currentWeek : addDaysKey(currentWeek, -7);
  let weeks = 0;
  while (set.has(week)) {
    weeks += 1;
    week = addDaysKey(week, -7);
  }
  return { weeks, activeThisWeek };
}

// ---------- Mục tiêu chung của lớp trong tháng: mỗi bạn góp 10 sao ----------
export const CLASS_GOAL_PER_STUDENT = 10;
export function classGoal(stars: number, students: number): { stars: number; target: number; percent: number; reached: boolean } {
  const target = Math.max(CLASS_GOAL_PER_STUDENT, students * CLASS_GOAL_PER_STUDENT);
  return { stars, target, percent: Math.min(100, Math.round((stars / target) * 100)), reached: stars >= target };
}
