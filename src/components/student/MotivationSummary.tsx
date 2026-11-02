// Tóm tắt động lực trên trang học sinh (35.17): tổng sao, chuỗi học theo tuần, mục tiêu chung của lớp trong tháng.
// Không xếp hạng cá nhân: chỉ hiện sao của con và tổng sao cả lớp cùng góp.
import { FlameIcon, SparkleFillIcon, StarFillIcon, TrophyIcon } from '@primer/octicons-react';
import { monthLabel } from '@/lib/datetime';
import type { StudentMotivation } from '@/lib/queries/motivation';

const TILE_CARD =
  'tsukuba-rise rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4';

export function MotivationSummary({ m }: { m: StudentMotivation }) {
  const goal = m.classGoal;
  return (
    <section aria-label="Sao của con" className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
      <div className={`flex items-center gap-3.5 ${TILE_CARD}`}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--borderColor-attention-muted,var(--borderColor-default))] bg-butter text-butter-ink">
          <StarFillIcon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fgColor-muted)]">
            Tổng sao tích luỹ
          </span>
          <b className="block text-2xl font-semibold leading-tight tabular-nums text-[var(--fgColor-default)]" aria-label={`${m.totalStars} sao`}>
            {m.totalStars} sao
          </b>
          <small className="mt-0.5 block text-xs tabular-nums text-[var(--fgColor-muted)]">
            {m.assignmentStars} từ bài tập · {m.gameStars} từ trò chơi
          </small>
        </div>
      </div>

      <div className={`flex items-center gap-3.5 ${TILE_CARD}`}>
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${
            m.streak.weeks > 0
              ? 'border-[var(--primary)]/25 bg-[var(--primary-soft)] text-[var(--primary)]'
              : 'border-[var(--borderColor-success-muted)] bg-mint text-mint-ink'
          }`}
        >
          {m.streak.weeks > 0 ? <FlameIcon size={20} aria-hidden /> : <SparkleFillIcon size={20} aria-hidden />}
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fgColor-muted)]">
            Chuỗi chuyên cần
          </span>
          <b className="block text-base font-semibold leading-snug tabular-nums text-[var(--fgColor-default)]">
            {m.streak.weeks > 0 ? `Học ${m.streak.weeks} tuần liền` : 'Bắt đầu chuỗi tuần'}
          </b>
          <small className="mt-0.5 block text-xs text-[var(--fgColor-muted)]">
            {m.streak.activeThisWeek ? 'Tuần này con đã học rồi. Giỏi lắm!' : 'Tuần này làm một bài hoặc chơi một trò để giữ chuỗi.'}
          </small>
        </div>
      </div>

      <div className={`flex flex-col justify-center gap-2 ${TILE_CARD}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--fgColor-default)]">
            <TrophyIcon size={15} className="text-[var(--primary)]" aria-hidden />
            Mục tiêu của lớp
          </span>
          <small className="font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">tháng {monthLabel(goal.month)}</small>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-[var(--bgColor-neutral-muted,var(--bgColor-muted))]"
          role="progressbar"
          aria-label="Sao cả lớp góp"
          aria-valuemin={0}
          aria-valuemax={goal.target}
          aria-valuenow={Math.min(goal.stars, goal.target)}
        >
          <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${goal.percent}%` }} />
        </div>
        <small className="text-xs tabular-nums text-[var(--fgColor-muted)]">
          {goal.reached ? `Cả lớp đạt ${goal.stars}/${goal.target} sao. Cả lớp giỏi quá!` : `Cả lớp đã góp ${goal.stars}/${goal.target} sao`}
        </small>
      </div>
    </section>
  );
}
