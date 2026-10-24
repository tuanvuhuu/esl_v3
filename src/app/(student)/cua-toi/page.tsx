import { connection } from 'next/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LearningPath } from '@/components/student/LearningPath';
import { MotivationSummary } from '@/components/student/MotivationSummary';
import { RewardsShelf } from '@/components/student/RewardsShelf';
import { PageHeader } from '@/components/ui/PageHeader';
import { BTN_BASE, BTN_PRIMARY } from '@/components/ui/Btn';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { vnDateTimeLabel } from '@/lib/datetime';
import { studentMotivation } from '@/lib/queries/motivation';
import { enrolledStudent } from '@/lib/queries/student-portal';
import { wordBoxSummary } from '@/lib/queries/word-box';
import { studentWordLists } from '@/lib/queries/word-lists';
import { getCurrentAccount } from '@/lib/session';

// Trang học sinh: sao và chuỗi tuần, ôn từ hôm nay (35.18), đường học theo bài, trò chơi từ vựng (35.15),
// bộ sưu tập sticker và truyện (35.17).
// Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function StudentHomePage() {
  return (
    <Suspense fallback={<section aria-busy="true" className="h-[240px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />}>
      <StudentHomeData />
    </Suspense>
  );
}

async function StudentHomeData() {
  await connection();
  const account = await getCurrentAccount();
  if (!account || account.studentId === null) redirect('/dang-nhap');
  const [m, student, box] = await Promise.all([studentMotivation(account.studentId), enrolledStudent(account.studentId), wordBoxSummary(account.studentId)]);
  const games = student ? await studentWordLists(student.classId) : [];
  const path = m?.path ?? [];

  return (
    <section className="flex flex-col gap-4">
      <PageHeader crumbs={['Khu học sinh']} title="Bài của tôi" subtitle="Làm bài và chơi trò chơi để nhận sao. Sai không bị trừ sao." titleOnTopbar={false} />

      {m && <MotivationSummary m={m} />}

      {(box.total > 0 || games.length > 0) && (
        <Card as="section" aria-label="Ôn từ hôm nay" className="min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-4xl" aria-hidden>🧠</span>
            <div className="min-w-0">
              <b className="block text-lg font-extrabold text-ink">{box.dueToday > 0 ? `Hôm nay có ${box.dueToday} từ cần ôn` : box.total > 0 ? 'Hôm nay con ôn xong rồi' : 'Hộp từ đang trống'}</b>
              <small className="text-sm text-muted">
                {box.total > 0
                  ? `Hộp từ có ${box.total} từ${box.dueToday === 0 && box.nextDue ? ` · lần ôn tới ${vnDateTimeLabel(box.nextDue).slice(0, 10)}` : ''}`
                  : 'Chơi một trò chơi từ vựng để có từ trong hộp.'}
              </small>
            </div>
          </div>
          {box.dueToday > 0 && (
            <Link href="/cua-toi/on-tu" className={`${BTN_BASE} ${BTN_PRIMARY} max-[599px]:w-full`}>
              Ôn {box.dueToday} từ
            </Link>
          )}
        </Card>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="path-title">
        <h2 id="path-title" className="text-lg font-extrabold text-ink">Đường học</h2>
        {path.length === 0 ? <EmptyPanel title="Lớp chưa có bài tập" hint="Khi giáo viên giao bài, bài sẽ hiện ở đây." /> : <LearningPath steps={path} />}
      </section>

      {games.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="word-games-title">
          <h2 id="word-games-title" className="text-lg font-extrabold text-ink">Trò chơi từ vựng</h2>
          <ul className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
            {games.map((g) => (
              <li key={g.id}>
                <Card>
                  <Link href={`/cua-toi/tro-choi/${g.id}`} className="text-base font-normal text-link underline underline-offset-2 [overflow-wrap:anywhere]">
                    {g.name}
                  </Link>
                  <small className="text-sm text-muted">{g.wordCount} từ · 8 trò chơi: lật thẻ, bingo, đoán chữ, đua xe…</small>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {m && <RewardsShelf totalStars={m.totalStars} />}
    </section>
  );
}
