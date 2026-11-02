// Nội dung hồ sơ học sinh. Dùng chung cho trang riêng (điện thoại, đường dẫn trực tiếp) và ngăn kéo (máy tính).
// Không có Sửa hay Xoá trong hồ sơ (docs/DESIGN.md mục 6). Chân hồ sơ chỉ có Nhắc học phí.
import { ArrowLeftIcon, XIcon } from '@primer/octicons-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { HistoryTimeline } from '@/components/learning/HistoryTimeline';
import { LearningEventButton } from '@/components/learning/LearningEventDialog';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Chip } from '@/components/ui/controls';
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
      <Panel title={`Phụ huynh (${student.parents.length})`}>
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
      >
        <HistoryTimeline items={history} />
      </Panel>
    );
  } else if (tab === 'ky-nang') {
    body = <ProfileSkills studentId={student.id} skills={skills} canManage={perms.learning} />;
  } else {
    body = (
      <div className="grid gap-4 min-[1200px]:grid-cols-2">
        <div className="min-[1200px]:col-span-2">
          <StudentAccountPanel studentId={student.id} code={student.code} hasAccount={student.hasAccount} canManage={perms.assignments} />
        </div>
        <div className="min-[1200px]:col-span-2">
          <ConsentPanel studentId={student.id} />
        </div>
        <Panel title="Khoá học hiện tại">
          <b className="block text-sm font-semibold text-[var(--fgColor-default)]">{student.course}</b>
          <small className="block text-xs text-[var(--fgColor-muted)]">Lớp {student.className} · {student.teacherName}</small>
          <span className="mt-2 inline-flex rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-accent-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--fgColor-accent)]">
            {student.schedule}
          </span>
          <ProgressBar value={student.sessionsDone} max={student.sessionsTotal} className="mt-4" />
          <div className="mt-2 flex justify-between text-xs text-[var(--fgColor-muted)]">
            <span>Bắt đầu {dateKeyLabel(student.startDate)}</span>
            <span>{student.sessionsLeft >= 0 ? `Còn ${student.sessionsLeft} buổi đã đóng` : `Nợ ${-student.sessionsLeft} buổi`}</span>
          </div>
        </Panel>

        <Panel title="Học phí">
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Đã nộp" value={formatVND(student.cash)} />
            {student.discount > 0 && <Row label="Giảm trừ" value={formatVND(student.discount)} />}
            <Row label="Buổi đã mua" value={`${student.sessionsBought} buổi`} />
            <Row label="Đã học" value={`${student.sessionsDone} buổi`} />
            <Row
              label="Còn lại"
              value={student.sessionsLeft >= 0 ? `${student.sessionsLeft} buổi` : `Nợ ${-student.sessionsLeft} buổi`}
              tone={student.sessionsLeft < 0 ? 'text-[var(--fgColor-danger)]' : undefined}
            />
            <Row
              label="Đang nợ"
              value={formatVND(student.debt)}
              tone={student.debt > 0 ? 'text-[var(--fgColor-danger)]' : 'text-[var(--fgColor-muted)]'}
            />
          </dl>
          <div className="mt-4 border-t border-[var(--borderColor-muted)] pt-3">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">Lịch sử thu</h3>
            {student.payments.length === 0 ? (
              <p className="text-sm text-[var(--fgColor-muted)]">Chưa có khoản thu nào.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {student.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--fgColor-muted)]">
                      {dateKeyLabel(p.paidAt)}{p.discount > 0 ? ` · giảm trừ ${formatVND(p.discount)}` : ''}{p.note ? ` · ${p.note}` : ''}
                    </span>
                    <b className="font-semibold tabular-nums text-[var(--fgColor-default)]">{formatVND(p.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title={student.recentMarks.length > 0 ? `Chuyên cần · ${student.recentMarks.length} buổi gần nhất` : 'Chuyên cần'}>
          {student.recentMarks.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-muted)]">Chưa có buổi học nào được điểm danh.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {student.recentMarks.map((mark, i) => (
                  <span key={i} title={MARK_META[mark].label} className={`size-4 rounded-full ${MARK_META[mark].className}`} aria-label={MARK_META[mark].label} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--fgColor-muted)]">
                {(Object.keys(MARK_META) as (keyof typeof MARK_META)[]).map((key) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className={`size-2.5 rounded-full ${MARK_META[key].className}`} aria-hidden />
                    {MARK_META[key].label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel title="Bài tập">
          {assignments.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-muted)]">Lớp chưa có bài tập nào.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
              {assignments.map((a) => (
                <li key={a.assignmentId} className="flex items-center justify-between gap-3 py-2.5">
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

        <Panel title="Liên hệ chính">
          {primary ? (
            <div className="flex items-center justify-between gap-3 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3.5 py-2.5">
              <div className="min-w-0">
                <b className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">{primary.fullName}</b>
                <small className="text-xs text-[var(--fgColor-muted)]">{PARENT_RELATION_LABELS[primary.relation]}</small>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={`tel:${primary.phone}`} className={`${BTN_BASE} ${BTN_GHOST}`}>{primary.phone}</a>
                <ZaloLink phone={primary.phone} name={primary.fullName} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--fgColor-muted)]">Chưa có phụ huynh.</p>
          )}
          <Link href={profileTabHref(base, 'phu-huynh')} className="mt-3 inline-flex text-sm font-semibold text-[var(--fgColor-link)] underline underline-offset-4">
            Xem tất cả phụ huynh
          </Link>
        </Panel>

        <Panel title="Ghi chú">
          <p className="whitespace-pre-line rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)] p-3.5 text-sm leading-relaxed text-[var(--fgColor-default)]">
            {student.note || 'Chưa có ghi chú.'}
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {drawerClose ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--fgColor-default)]">Hồ sơ học sinh</h2>
          <Link
            href={drawerClose}
            aria-label="Đóng hồ sơ"
            className="grid size-[var(--icon-h)] place-items-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] max-[767px]:size-[var(--icon-h-touch)]"
          >
            <XIcon size={16} aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <Link href="/hoc-sinh" className={`${BTN_BASE} ${BTN_GHOST}`}>
            <ArrowLeftIcon size={16} aria-hidden />
            Danh sách
          </Link>
        </div>
      )}

      <Panel>
        <div className="flex items-start gap-4">
          <Avatar name={student.fullName} seed={student.id} size="lg" />
          <div className="min-w-0 flex-1">
            <small className="block text-xs text-[var(--fgColor-muted)]">{student.code} · {student.gender === 'female' ? 'Nữ' : 'Nam'}</small>
            <h1 className="mt-0.5 text-h1 font-semibold leading-tight text-[var(--fgColor-default)] max-[767px]:text-2xl">{student.fullName}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={STATUS_META[student.status].tone}>{STATUS_META[student.status].label}</Pill>
              <Pill tone={TUITION_META[student.tuition].tone}>{TUITION_META[student.tuition].label}</Pill>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Stat label="Buổi đã học" value={`${student.sessionsDone}/${student.sessionsTotal}`} />
          <Stat label="Chuyên cần" value={`${student.attendanceRate}%`} />
          <Stat label="Còn thiếu" value={student.debt > 0 ? formatVND(student.debt) : 'Không'} />
        </div>
      </Panel>

      {/* Mục hồ sơ là liên kết (mỗi mục một đường dẫn), nên dùng nav và chip liên kết, không dùng vai trò tab */}
      <nav aria-label="Mục hồ sơ" className="flex flex-wrap items-center gap-2">
        {PROFILE_TABS.map((t) => (
          <Chip key={t.key} selected={t.key === tab} href={profileTabHref(base, t.key)}>
            {t.label}
          </Chip>
        ))}
      </nav>

      {body}

      {perms.tuition && (
        <div className="sticky bottom-0 -mx-1 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]/95 p-3 shadow-[var(--shadow-resting-small,0_1px_2px_rgba(0,0,0,0.04))] backdrop-blur-md">
          <TuitionRemindButton studentId={student.id} debt={student.debt} />
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3 py-2.5 text-center">
      <b className="block truncate text-sm font-medium tabular-nums text-[var(--fgColor-default)]">{value}</b>
      <small className="mt-0.5 block text-xs text-[var(--fgColor-muted)]">{label}</small>
    </div>
  );
}

function Row({ label, value, tone = 'text-[var(--fgColor-default)]' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--fgColor-muted)]">{label}</dt>
      <dd className={`text-right font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
