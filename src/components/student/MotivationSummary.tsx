// Tóm tắt động lực trên trang học sinh (35.17): tổng sao, chuỗi học theo tuần, mục tiêu chung của lớp trong tháng.
// Không xếp hạng cá nhân: chỉ hiện sao của con và tổng sao cả lớp cùng góp.
import { monthLabel } from '@/lib/datetime';
import type { StudentMotivation } from '@/lib/queries/motivation';

export function MotivationSummary({ m }: { m: StudentMotivation }) {
  const goal = m.classGoal;
  return (
    <section aria-label="Sao của con" className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
      <div className="flex items-center gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-card">
        <span className="text-4xl" aria-hidden>⭐</span>
        <div className="min-w-0">
          <b className="block text-2xl font-extrabold tabular-nums text-ink" aria-label={`${m.totalStars} sao`}>{m.totalStars} sao</b>
          <small className="text-sm text-muted">{m.assignmentStars} từ bài tập · {m.gameStars} từ trò chơi</small>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-card">
        <span className="text-4xl" aria-hidden>{m.streak.weeks > 0 ? '🔥' : '🌱'}</span>
        <div className="min-w-0">
          <b className="block text-lg font-extrabold text-ink">{m.streak.weeks > 0 ? `Học ${m.streak.weeks} tuần liền` : 'Bắt đầu chuỗi tuần'}</b>
          <small className="text-sm text-muted">
            {m.streak.activeThisWeek ? 'Tuần này con đã học rồi. Giỏi lắm!' : 'Tuần này làm một bài hoặc chơi một trò để giữ chuỗi.'}
          </small>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-2 rounded-[var(--radius-panel)] bg-surface p-4 shadow-card">
        <div className="flex items-baseline justify-between gap-2">
          <b className="text-base font-extrabold text-ink">Mục tiêu của lớp</b>
          <small className="text-sm text-muted">tháng {monthLabel(goal.month)}</small>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-stone"
          role="progressbar"
          aria-label="Sao cả lớp góp"
          aria-valuemin={0}
          aria-valuemax={goal.target}
          aria-valuenow={Math.min(goal.stars, goal.target)}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${goal.percent}%` }} />
        </div>
        <small className="text-sm text-ink-2">
          {goal.reached ? `Cả lớp đạt ${goal.stars}/${goal.target} sao. Cả lớp giỏi quá! 🎉` : `Cả lớp đã góp ${goal.stars}/${goal.target} sao`}
        </small>
      </div>
    </section>
  );
}
