// Tab Kỹ năng trong hồ sơ (P26): điểm trung bình theo bốn kỹ năng, xu hướng và điểm từng bài đã chấm.
import { SkillScore } from '@/components/skills/SkillScore';
import { ProgressBar } from '@/components/ui/primitives';
import { SKILL_LABELS, SKILLS, type Skill } from '@/lib/assignment-scoring';
import { vnDateTimeLabel } from '@/lib/datetime';
import { totalPercent, trendOf, type Trend } from '@/lib/skill-stats';
import type { SkillHistory } from '@/lib/queries/skills';
import { LevelPanel } from '@/components/levels/LevelPanel';
import { Panel, Card } from '@/components/ui/surfaces';

const TREND_LABEL: Record<Trend, string> = { up: 'Tăng', down: 'Giảm', flat: 'Ổn định', none: 'Chưa đủ 2 bài' };

const SKILL_ACCENT: Record<Skill, string> = {
  listening: 'border-l-[#2a78d6]',
  speaking: 'border-l-[#eb6834]',
  reading: 'border-l-[#1baf7a]',
  writing: 'border-l-[#8250df]',
};

export function ProfileSkills({ studentId, skills, canManage }: { studentId: number; skills: SkillHistory | null; canManage: boolean }) {
  if (!skills) return null;
  const level = skills.level;

  return (
    <div className="flex flex-col gap-3.5 tsukuba-rise">
      <LevelPanel
        studentId={studentId}
        current={level.current}
        levels={level.levels}
        next={level.next}
        check={level.check}
        canManage={canManage}
      />

      {skills.gradedCount === 0 ? (
        <Panel title="Kỹ năng">
          <p className="text-sm text-[var(--fgColor-muted)]">
            Chưa có bài đã chấm xong có câu hỏi kỹ năng. Khi chấm xong, điểm nghe, nói, đọc, viết hiện ở đây.
          </p>
        </Panel>
      ) : (
        <>
          <SkillCards skills={skills} />
          <SkillTrend skills={skills} />
        </>
      )}
    </div>
  );
}

function SkillCards({ skills }: { skills: SkillHistory }) {
  return (
    <section aria-label="Điểm trung bình theo kỹ năng" className="grid grid-cols-2 gap-3 min-[1200px]:grid-cols-4">
      {SKILLS.map((s: Skill) => {
        const total = skills.totals[s];
        const percent = totalPercent(total);
        return (
          <Card key={s} className={`border-l-[3px] ${SKILL_ACCENT[s]} !gap-2 !p-3.5`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--fgColor-muted)]">{SKILL_LABELS[s]}</span>
              <SkillScore percent={percent} />
            </div>
            <b className="text-2xl font-semibold leading-tight tabular-nums text-[var(--fgColor-default)]">
              {percent === null ? '—' : `${percent}%`}
            </b>
            <ProgressBar value={percent ?? 0} max={100} />
            <small className="text-xs tabular-nums text-[var(--fgColor-muted)]">
              {total.count === 0 ? 'Chưa có bài' : `${total.count} bài · ${total.raw}/${total.max} điểm`}
            </small>
          </Card>
        );
      })}
    </section>
  );
}

function SkillTrend({ skills }: { skills: SkillHistory }) {
  return (
    <Panel title="Xu hướng theo bài đã chấm">
      <ul className="mb-3.5 flex flex-wrap gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] p-2.5">
        {SKILLS.map((s: Skill) => {
          const trend = trendOf(skills.points.map((p) => p.percent[s]));
          return (
            <li
              key={s}
              className="inline-flex items-center gap-1.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2.5 py-1 text-xs text-[var(--fgColor-muted)]"
            >
              <span>{SKILL_LABELS[s]}:</span>
              <b className="font-medium text-[var(--fgColor-default)]">{TREND_LABEL[trend]}</b>
            </li>
          );
        })}
      </ul>
      <ol className="flex flex-col gap-2.5">
        {skills.points.map((p) => (
          <li
            key={p.assignmentId}
            className="flex flex-col gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3 transition-colors hover:border-[var(--borderColor-accent-emphasis)]/40"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b className="min-w-0 text-sm font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">{p.title}</b>
              <small className="font-mono text-xs text-[var(--fgColor-muted)]">{vnDateTimeLabel(new Date(p.dueAt))}</small>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {SKILLS.filter((s) => p.percent[s] !== null).map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-xs text-[var(--fgColor-muted)]">
                  {SKILL_LABELS[s]} <SkillScore percent={p.percent[s]} />
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
