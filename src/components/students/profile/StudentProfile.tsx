// Nội dung hồ sơ học sinh. Dùng chung cho trang riêng (điện thoại, đường dẫn trực tiếp) và ngăn kéo (máy tính).
// Không có Sửa hay Xoá trong hồ sơ (docs/DESIGN.md mục 6). Chân hồ sơ chỉ có Nhắc học phí.
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, DeviceMobileIcon, MortarBoardIcon, XIcon } from '@primer/octicons-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { HistoryTimeline } from '@/components/learning/HistoryTimeline';
import { LearningEventButton } from '@/components/learning/LearningEventDialog';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/btn-classes';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { Avatar, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { ZaloLink } from '@/components/ui/ZaloLink';
import { formatVND } from '@/lib/money';
import { dateKeyLabel, vnDateTimeLabel } from '@/lib/datetime';
import type { HistoryItem } from '@/lib/learning-history';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import { profileTabHref } from '@/lib/student-url';
import type { StudentDetail } from '@/lib/queries/students';
import type { StudentAssignmentRow } from '@/lib/queries/assignments';
import { SUBMISSION_LABELS } from '@/lib/validation/assignment';
import type { SkillHistory } from '@/lib/queries/skills';
import { ProfileParents } from './ProfileParents';
import { ProfileSkills } from './ProfileSkills';
import { ConsentPanel } from './ConsentPanel';
import { StudentAccountPanel } from './StudentAccountPanel';
import { TuitionRemindButton } from './TuitionRemindButton';

const STATUS_META: Record<StudentDetail['status'], { label: string; tone: Tone }> = {
  active: { label: 'Đang học', tone: 'mint' },
  trial: { label: 'Học thử', tone: 'lav' },
  paused: { label: 'Bảo lưu', tone: 'stone' },
  finished: { label: 'Đã nghỉ', tone: 'blush' },
};

const TUITION_META: Record<StudentDetail['tuition'], { label: string; tone: Tone }> = {
  paid: { label: 'Đã đóng', tone: 'mint' },
  partial: { label: 'Còn nợ', tone: 'butter' },
  unpaid: { label: 'Chưa đóng', tone: 'blush' },
};

const MARK_META = {
  present: { label: 'Có mặt', className: 'bg-[var(--fgColor-success)]' },
  late: { label: 'Trễ', className: 'bg-[var(--fgColor-attention)]' },
  absent: { label: 'Vắng', className: 'bg-[var(--fgColor-danger)]' },
  excused: { label: 'Có phép', className: 'bg-[var(--fgColor-done)]' },
} as const;

export const PROFILE_TABS = [
  { key: 'tong-quan', label: 'Tổng quan' },
  { key: 'phu-huynh', label: 'Phụ huynh' },
  { key: 'hoc-tap', label: 'Học tập' },
  { key: 'ky-nang', label: 'Kỹ năng' },
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number]['key'];

export function StudentProfile({
  base,
  tab,
  student,
  history,
  assignments,
  parentChoices,
  skills,
  perms,
  drawerClose,
}: {
  base: string; // đường dẫn gốc của hồ sơ, ví dụ /hoc-sinh/12 hoặc /hoc-sinh?h=12
  tab: ProfileTab;
  student: StudentDetail;
  history: HistoryItem[];
  assignments: StudentAssignmentRow[];
  parentChoices: { id: number; fullName: string; phone: string }[];
  skills: SkillHistory | null; // chỉ có khi đang mở tab Kỹ năng
  perms: { tuition: boolean; parents: boolean; learning: boolean; assignments: boolean };
  drawerClose?: string;
}) {
  const primary = student.parents.find((p) => p.isPrimary) ?? student.parents[0];

  let body: ReactNode;
  if (tab === 'phu-huynh') {
    body = (
      <Panel title={`Phụ huynh (${student.parents.length})`} className="tsukuba-rise">
        <ProfileParents
          studentId={student.id}
          studentName={student.fullName}
          parents={student.parents}
          choices={parentChoices}
          canManage={perms.parents}
        />
      </Panel>
    );
  } else if (tab === 'hoc-tap') {
    body = (
      <Panel
        title="Lịch sử học tập"
        action={perms.learning ? <LearningEventButton studentId={student.id} studentName={student.fullName} /> : null}
        className="tsukuba-rise"
      >
        <HistoryTimeline items={history} />
      </Panel>
    );
  } else if (tab === 'ky-nang') {
    body = <ProfileSkills studentId={student.id} skills={skills} canManage={perms.learning} />;
  } else {
    body = (
      <div className="grid gap-3.5 min-[1200px]:grid-cols-2">
        <div className="min-[1200px]:col-span-2">
          <StudentAccountPanel studentId={student.id} code={student.code} hasAccount={student.hasAccount} canManage={perms.assignments} />
        </div>
        <div className="min-[1200px]:col-span-2">
          <ConsentPanel studentId={student.id} />
        </div>

        <Panel title="Khoá học hiện tại" className="tsukuba-rise">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <b className="block text-sm font-semibold text-[var(--fgColor-default)]">{student.course}</b>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--fgColor-muted)]">
                <span className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primary-deep)]">
                  <MortarBoardIcon size={12} aria-hidden />
                  Lớp {student.className}
                </span>
                {student.teacherName && <span>· {student.teacherName}</span>}
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-accent-muted,var(--borderColor-default))] bg-[var(--bgColor-accent-muted)] px-2 py-0.5 text-xs font-medium text-[var(--fgColor-accent)]">
              <CalendarIcon size={12} aria-hidden />
              {student.schedule}
            </span>
          </div>
          <ProgressBar value={student.sessionsDone} max={student.sessionsTotal} className="mt-3.5" />
          <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-[var(--fgColor-muted)]">
            <span>Bắt đầu {dateKeyLabel(student.startDate)}</span>
            <span className={student.sessionsLeft < 0 ? 'font-medium text-[var(--fgColor-danger)]' : 'font-medium text-[var(--fgColor-default)]'}>
              {student.sessionsLeft >= 0 ? `Còn ${student.sessionsLeft} buổi đã đóng` : `Nợ ${-student.sessionsLeft} buổi`}
            </span>
          </div>
        </Panel>

        <Panel title="Học phí" className="tsukuba-rise">
          <dl className="flex flex-col text-sm">
            <SlipRow label="Đã nộp" value={formatVND(student.cash)} />
            {student.discount > 0 && <SlipRow label="Giảm trừ" value={`− ${formatVND(student.discount)}`} />}
            <SlipRow label="Buổi đã mua" value={`${student.sessionsBought} buổi`} />
            <SlipRow label="Đã học" value={`${student.sessionsDone} buổi`} />
            <SlipRow
              label="Còn lại"
              value={student.sessionsLeft >= 0 ? `${student.sessionsLeft} buổi` : `Nợ ${-student.sessionsLeft} buổi`}
              tone={student.sessionsLeft < 0 ? 'text-[var(--fgColor-danger)]' : 'text-[var(--fgColor-default)]'}
            />
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-[var(--borderColor-default)] pt-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">Đang nợ</dt>
              <dd className={`text-right text-base font-semibold tabular-nums ${student.debt > 0 ? 'text-[var(--fgColor-danger)]' : 'text-[var(--fgColor-success)]'}`}>
                {formatVND(student.debt)}
              </dd>
            </div>
          </dl>

          <div className="mt-3.5 border-t border-[var(--borderColor-muted)] pt-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">Lịch sử thu</h3>
            {student.payments.length === 0 ? (
              <p className="text-sm text-[var(--fgColor-muted)]">Chưa có khoản thu nào.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-dashed divide-[var(--borderColor-muted)]">
                {student.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-1.5 text-sm first:pt-0 last:pb-0">
                    <span className="min-w-0 truncate text-xs text-[var(--fgColor-muted)]">
                      <span className="font-mono">{dateKeyLabel(p.paidAt)}</span>
                      {p.discount > 0 ? ` · giảm trừ ${formatVND(p.discount)}` : ''}
                      {p.note ? ` · ${p.note}` : ''}
                    </span>
                    <b className="shrink-0 font-semibold tabular-nums text-[var(--fgColor-default)]">{formatVND(p.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title={student.recentMarks.length > 0 ? `Chuyên cần · ${student.recentMarks.length} buổi gần nhất` : 'Chuyên cần'} className="tsukuba-rise">
          {student.recentMarks.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-muted)]">Chưa có buổi học nào được điểm danh.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] p-3">
                {student.recentMarks.map((mark, i) => (
                  <span
                    key={i}
                    title={MARK_META[mark].label}
                    className={`size-4 rounded-full ring-2 ring-[var(--bgColor-default)] ${MARK_META[mark].className}`}
                    aria-label={MARK_META[mark].label}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3.5 text-xs text-[var(--fgColor-muted)]">
                {(Object.keys(MARK_META) as (keyof typeof MARK_META)[]).map((key) => (
                  <span key={key} className="inline-flex items-center gap-1.5">
                    <span className={`size-2.5 rounded-full ${MARK_META[key].className}`} aria-hidden />
                    {MARK_META[key].label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel title="Bài tập" className="tsukuba-rise">
          {assignments.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-muted)]">Lớp chưa có bài tập nào.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
              {assignments.map((a) => (
                <li key={a.assignmentId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <b className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">{a.title}</b>
                    <small className="text-xs text-[var(--fgColor-muted)]">Hạn {vnDateTimeLabel(new Date(a.dueAt))}</small>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {a.status === 'graded' ? (
                      <Pill tone="mint">{a.score}/{a.maxScore}</Pill>
                    ) : a.overdue ? (
                      <Pill tone="blush">Quá hạn</Pill>
                    ) : (
                      <Pill tone={a.status === 'submitted' ? 'butter' : 'stone'}>{SUBMISSION_LABELS[a.status]}</Pill>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Liên hệ chính" className="tsukuba-rise">
          {primary ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-3.5 py-2.5">
              <div className="min-w-0">
                <b className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">{primary.fullName}</b>
                <small className="text-xs text-[var(--fgColor-muted)]">{PARENT_RELATION_LABELS[primary.relation]}</small>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={`tel:${primary.phone}`} className={`${BTN_BASE} ${BTN_GHOST}`}>
                  <DeviceMobileIcon size={14} aria-hidden />
                  {primary.phone}
                </a>
                <ZaloLink phone={primary.phone} name={primary.fullName} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--fgColor-muted)]">Chưa có phụ huynh.</p>
          )}
          <Link
            href={profileTabHref(base, 'phu-huynh')}
            data-link="true"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-link)] hover:underline"
          >
            <span>Xem tất cả phụ huynh</span>
            <ArrowRightIcon size={12} aria-hidden />
          </Link>
        </Panel>

        <Panel title="Ghi chú" className="tsukuba-rise">
          <p className="whitespace-pre-line rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] p-3.5 text-sm leading-relaxed text-[var(--fgColor-default)]">
            {student.note || 'Chưa có ghi chú.'}
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3.5">
      {drawerClose ? (
        <div className="-mx-5 -mt-5 mb-0.5 flex items-center justify-between gap-3 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="h-3.5 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
            <h2 className="m-0 truncate text-sm font-semibold text-[var(--fgColor-default)]">Hồ sơ học sinh</h2>
            <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--ink-2)]">
              {student.code}
            </span>
          </div>
          <Link
            href={drawerClose}
            scroll={false}
            aria-label="Đóng hồ sơ"
            className="grid size-[var(--icon-h)] shrink-0 place-items-center rounded-[var(--borderRadius-medium)] text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] max-[767px]:size-[var(--icon-h-touch)]"
          >
            <XIcon size={16} aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageCrumbs crumbs={['Đào tạo', 'Học sinh', student.fullName]} />
          <Link href="/hoc-sinh" className={`${BTN_BASE} ${BTN_GHOST}`}>
            <ArrowLeftIcon size={16} aria-hidden />
            Danh sách
          </Link>
        </div>
      )}

      {/* Thẻ Hero hồ sơ chuẩn 01. TSUKUBA: viền trái cam đỏ, avatar tròn, chip mã font-mono và dải KPI 3 cột */}
      <div className="tsukuba-rise overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-4 border-l-[var(--primary)] bg-[var(--bgColor-default)] p-4 shadow-[var(--shadow)] sm:p-5">
        <div className="flex items-start gap-4">
          <Avatar name={student.fullName} seed={student.id} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--ink-2)]">
                {student.code}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-2)]">
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${student.gender === 'female' ? 'bg-[#ec4899]' : 'bg-[#0ea5e9]'}`}
                />
                {student.gender === 'female' ? 'Nữ' : 'Nam'}
              </span>
              <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-deep)]">
                Lớp {student.className}
              </span>
            </div>
            <h1 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-[var(--fgColor-default)] max-[767px]:text-lg">
              {student.fullName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Pill tone={STATUS_META[student.status].tone}>{STATUS_META[student.status].label}</Pill>
              <Pill tone={TUITION_META[student.tuition].tone}>{TUITION_META[student.tuition].label}</Pill>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-[var(--borderColor-muted)] pt-3.5 max-[480px]:grid-cols-1">
          <HeroStat
            label="Buổi đã học"
            value={`${student.sessionsDone}/${student.sessionsTotal}`}
            sub={student.sessionsLeft >= 0 ? `Còn ${student.sessionsLeft} buổi` : `Nợ ${-student.sessionsLeft} buổi`}
            accent="border-l-[#2a78d6]"
          />
          <HeroStat
            label="Chuyên cần"
            value={`${student.attendanceRate}%`}
            sub={student.attendanceRate >= 75 ? 'Đạt yêu cầu' : 'Cần theo dõi'}
            accent={student.attendanceRate >= 75 ? 'border-l-[#1baf7a]' : 'border-l-[var(--fgColor-danger)]'}
            valueTone={student.attendanceRate < 75 ? 'text-[var(--fgColor-danger)]' : undefined}
          />
          <HeroStat
            label="Còn thiếu"
            value={student.debt > 0 ? formatVND(student.debt) : 'Không'}
            sub={student.debt > 0 ? 'Chưa hoàn tất' : 'Đã đóng đủ'}
            accent={student.debt > 0 ? 'border-l-[#eb6834]' : 'border-l-[#1baf7a]'}
            valueTone={student.debt > 0 ? 'text-[var(--fgColor-danger)]' : 'text-[var(--fgColor-success)]'}
          />
        </div>
      </div>

      {/* Mục hồ sơ là liên kết (mỗi mục một đường dẫn), nên dùng nav và dải ChipGroup mượt kiểu 01. TSUKUBA */}
      <nav aria-label="Mục hồ sơ" className="flex flex-wrap items-center">
        <ChipGroup label="Chuyển mục hồ sơ">
          {PROFILE_TABS.map((t) => (
            <Chip key={t.key} selected={t.key === tab} href={profileTabHref(base, t.key)}>
              {t.label}
            </Chip>
          ))}
        </ChipGroup>
      </nav>

      {body}

      {perms.tuition && (
        <div
          className={
            drawerClose
              ? 'sticky bottom-0 -mx-1 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]/95 p-3 shadow-[var(--shadow)] backdrop-blur-md'
              : 'max-[767px]:sticky max-[767px]:bottom-0 max-[767px]:-mx-1 max-[767px]:rounded-[var(--borderRadius-large)] max-[767px]:border max-[767px]:border-[var(--borderColor-default)] max-[767px]:bg-[var(--bgColor-default)]/95 max-[767px]:p-3 max-[767px]:shadow-[var(--shadow)] max-[767px]:backdrop-blur-md min-[768px]:self-end'
          }
        >
          <TuitionRemindButton studentId={student.id} debt={student.debt} />
        </div>
      )}
    </section>
  );
}

function HeroStat({
  label,
  value,
  sub,
  accent,
  valueTone = 'text-[var(--fgColor-default)]',
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  valueTone?: string;
}) {
  return (
    <div
      className={`rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] border-l-[3px] ${accent} bg-[var(--bgColor-default)] px-3.5 py-2.5 shadow-2xs`}
    >
      <span className="block text-[11px] font-medium text-[var(--fgColor-muted)]">{label}</span>
      <b className={`mt-0.5 block truncate text-base font-semibold tabular-nums ${valueTone}`}>{value}</b>
      {sub && <small className="block truncate text-[11px] text-[var(--fgColor-muted)]">{sub}</small>}
    </div>
  );
}

function SlipRow({ label, value, tone = 'text-[var(--fgColor-default)]' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--borderColor-muted)] py-1.5 first:pt-0">
      <dt className="text-[var(--fgColor-muted)]">{label}</dt>
      <dd className={`text-right font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
