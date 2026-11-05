import { LightBulbIcon, MilestoneIcon, PlayIcon, RocketIcon, SparklesFillIcon } from '@primer/octicons-react';
import { connection } from 'next/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LearningPath } from '@/components/student/LearningPath';
import { MotivationSummary } from '@/components/student/MotivationSummary';
import { RewardsShelf } from '@/components/student/RewardsShelf';
import { BTN_BASE, BTN_PRIMARY } from '@/components/ui/btn-classes';
import { Pill } from '@/components/ui/primitives';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { vnDateTimeLabel } from '@/lib/datetime';
import { studentMotivation } from '@/lib/queries/motivation';
import { enrolledStudent } from '@/lib/queries/student-portal';
import { wordBoxSummary } from '@/lib/queries/word-box';
import { studentWordLists } from '@/lib/queries/word-lists';
import { getCurrentAccount } from '@/lib/session';

// Trang học sinh: thẻ chào mừng kiểu Portal (01. TSUKUBA), sao và chuỗi tuần, ôn từ hôm nay (35.18),
// đường học theo bài, trò chơi từ vựng (35.15), bộ sưu tập sticker và truyện (35.17).
export default function StudentHomePage() {
  return (
    <Suspense
      fallback={
        <section aria-busy="true" className="flex flex-col gap-4">
          <div className="h-[104px] animate-pulse rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]" />
          <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
            <div className="h-[88px] animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />
            <div className="h-[88px] animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />
            <div className="h-[88px] animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />
          </div>
          <div className="h-[220px] animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />
        </section>
      }
    >
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
    <section className="flex flex-col gap-5">
      {/* Thẻ chào mừng chuẩn Portal.module.css (.hero) của 01. TSUKUBA */}
      <div className="tsukuba-rise flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--borderColor-default)] border-l-4 border-l-[var(--primary)] bg-[var(--bgColor-default)] p-4 shadow-[var(--shadow)] min-[640px]:p-5">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--primary)]">
            <SparklesFillIcon size={12} aria-hidden />
            Khu học sinh
          </span>
          <h1 className="m-0 mt-1 text-xl font-semibold tracking-tight text-[var(--fgColor-default)] min-[640px]:text-2xl">
            Bài của tôi
          </h1>
          <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
            Xin chào <b className="font-semibold text-[var(--fgColor-default)]">{account.fullName}</b> · Làm bài và chơi trò chơi để nhận sao. Sai không bị trừ sao.
          </p>
        </div>
        {path.length > 0 && (
          <Pill tone="lav">
            {path.filter((p) => p.status !== 'not_submitted').length}/{path.length} bài hoàn thành
          </Pill>
        )}
      </div>

      {m && <MotivationSummary m={m} />}

      {(box.total > 0 || games.length > 0) && (
        <Card
          as="section"
          aria-label="Ôn từ hôm nay"
          className="tsukuba-rise min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--borderColor-default)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <LightBulbIcon size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <b className="block text-base font-semibold text-[var(--fgColor-default)]">
                {box.dueToday > 0 ? `Hôm nay có ${box.dueToday} từ cần ôn` : box.total > 0 ? 'Hôm nay con ôn xong rồi' : 'Hộp từ đang trống'}
              </b>
              <small className="text-sm text-[var(--fgColor-muted)]">
                {box.total > 0
                  ? `Hộp từ có ${box.total} từ${box.dueToday === 0 && box.nextDue ? ` · lần ôn tới ${vnDateTimeLabel(box.nextDue).slice(0, 10)}` : ''}`
                  : 'Chơi một trò chơi từ vựng để có từ trong hộp.'}
              </small>
            </div>
          </div>
          {box.dueToday > 0 && (
            <Link href="/cua-toi/on-tu" className={`${BTN_BASE} ${BTN_PRIMARY} shrink-0 max-[599px]:w-full`}>
              <PlayIcon size={15} aria-hidden />
              Ôn {box.dueToday} từ
            </Link>
          )}
        </Card>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="path-title">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MilestoneIcon size={16} className="text-[var(--primary)]" aria-hidden />
            <h2 id="path-title" className="m-0 text-base font-semibold text-[var(--fgColor-default)]">
              Đường học
            </h2>
          </div>
          {path.length > 0 && (
            <span className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2 py-0.5 font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
              {path.filter((p) => p.status !== 'not_submitted').length}/{path.length} bài
            </span>
          )}
        </div>
        {path.length === 0 ? (
          <EmptyPanel title="Lớp chưa có bài tập" hint="Khi giáo viên giao bài, bài sẽ hiện ở đây." />
        ) : (
          <LearningPath steps={path} />
        )}
      </section>

      {games.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="word-games-title">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RocketIcon size={16} className="text-[var(--primary)]" aria-hidden />
              <h2 id="word-games-title" className="m-0 text-base font-semibold text-[var(--fgColor-default)]">
                Trò chơi từ vựng
              </h2>
            </div>
            <span className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2 py-0.5 font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
              {games.length} bộ từ
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
            {games.map((g) => (
              <li key={g.id}>
                <Card className="tsukuba-rise h-full justify-between transition-all hover:border-[var(--borderColor-accent-emphasis)]">
                  <div className="flex items-start justify-between gap-2.5">
                    <Link
                      href={`/cua-toi/tro-choi/${g.id}`}
                      data-link="true"
                      className="text-base font-semibold text-[var(--fgColor-link)] underline underline-offset-2 [overflow-wrap:anywhere]"
                    >
                      {g.name}
                    </Link>
                    <Pill tone="mint">{g.wordCount} từ</Pill>
                  </div>
                  <small className="text-xs text-[var(--fgColor-muted)]">
                    8 trò chơi: lật thẻ, bingo, đoán chữ, đua xe…
                  </small>
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
