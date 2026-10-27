// Nội dung hồ sơ học sinh. Dùng chung cho trang riêng (điện thoại, đường dẫn trực tiếp) và ngăn kéo (máy tính).
// Không có Sửa hay Xoá trong hồ sơ (docs/DESIGN.md mục 6). Chân hồ sơ chỉ có Nhắc học phí.
import { ZaloLink } from '@/components/ui/ZaloLink';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { HistoryTimeline } from '@/components/learning/HistoryTimeline';
import { LearningEventButton } from '@/components/learning/LearningEventDialog';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Chip } from '@/components/ui/controls';
import { Avatar, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
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
import { Panel } from '@/components/ui/surfaces';

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
  present: { label: 'Có mặt', className: 'bg-accent' },
  late: { label: 'Trễ', className: 'bg-[#E0B84A]' },
  absent: { label: 'Vắng', className: 'bg-blush-ink' },
  excused: { label: 'Có phép', className: 'bg-lav-ink' },
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
  const remaining = Math.max(0, student.sessionsTotal - student.sessionsDone);
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
          <b className="block text-md text-ink">{student.course}</b>
          <small className="block text-sm text-muted">Lớp {student.className} · {student.teacherName}</small>
          <span className="mt-2 inline-flex rounded-lg bg-primary-soft px-2.5 py-1 text-sm font-semibold text-ink">{student.schedule}</span>
          <ProgressBar value={student.sessionsDone} max={student.sessionsTotal} className="mt-4" />
          <div className="mt-2 flex justify-between text-sm text-muted">
            <span>Bắt đầu {dateKeyLabel(student.startDate)}</span>
            <span>Còn {remaining} buổi</span>
          </div>
        </Panel>

        <Panel title="Học phí">
          <dl className="flex flex-col gap-2.5 text-base">
            <Row label={student.discount > 0 ? 'Học phí khoá (sau giảm trừ)' : 'Học phí khoá'} value={formatVND(student.fee)} />
            {student.discount > 0 && <Row label="Giảm trừ" value={`− ${formatVND(student.discount)}`} />}
            <Row label="Đã đóng" value={formatVND(student.paid)} />
            <Row label="Còn thiếu" value={formatVND(student.debt)} tone={student.debt > 0 ? 'text-blush-ink' : 'text-muted'} />
          </dl>
          <div className="mt-4 border-t border-line pt-3">
            <h3 className="mb-2 text-xs font-normal uppercase tracking-wider text-muted">Lịch sử thu</h3>
            {student.payments.length === 0 ? (
              <p className="text-sm text-muted">Chưa có khoản thu nào.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {student.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{dateKeyLabel(p.paidAt)}{p.note ? ` · ${p.note}` : ''}</span>
                    <b className="text-ink">{formatVND(p.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title={student.recentMarks.length > 0 ? `Chuyên cần · ${student.recentMarks.length} buổi gần nhất` : 'Chuyên cần'}>
          {student.recentMarks.length === 0 ? (
            <p className="text-sm text-muted">Chưa có buổi học nào được điểm danh.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {student.recentMarks.map((mark, i) => (
                  <span key={i} title={MARK_META[mark].label} className={`size-4 rounded-full ${MARK_META[mark].className}`} aria-label={MARK_META[mark].label} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
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
            <p className="text-sm text-muted">Lớp chưa có bài tập nào.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {assignments.map((a) => (
                <li key={a.assignmentId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <b className="block truncate text-base text-ink">{a.title}</b>
                    <small className="text-xs text-muted">Hạn {vnDateTimeLabel(new Date(a.dueAt))}</small>
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
            <div className="flex items-center justify-between gap-3 rounded-[16px] bg-bg px-3.5 py-2.5">
              <div className="min-w-0">
                <b className="block truncate text-base text-ink">{primary.fullName}</b>
                <small className="text-sm text-muted">{PARENT_RELATION_LABELS[primary.relation]}</small>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={`tel:${primary.phone}`} className={`${BTN_BASE} ${BTN_GHOST}`}>{primary.phone}</a>
                <ZaloLink phone={primary.phone} name={primary.fullName} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Chưa có phụ huynh.</p>
          )}
          <Link href={profileTabHref(base, 'phu-huynh')} className="mt-3 inline-flex text-sm font-bold text-ink underline underline-offset-4">Xem tất cả phụ huynh</Link>
        </Panel>

        <Panel title="Ghi chú">
          <p className="whitespace-pre-line rounded-[16px] bg-bg p-4 text-base leading-relaxed text-ink-2">{student.note || 'Chưa có ghi chú.'}</p>
        </Panel>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {drawerClose ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-ink">Hồ sơ học sinh</h2>
          <Link href={drawerClose} aria-label="Đóng hồ sơ" className="grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-2">
            <X className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <Link href="/hoc-sinh" className={`${BTN_BASE} ${BTN_GHOST}`}>
            <ArrowLeft className="size-4" aria-hidden />
            Danh sách
          </Link>
        </div>
      )}

      <Panel>
        <div className="flex items-start gap-4">
          <Avatar name={student.fullName} seed={student.id} size="lg" />
          <div className="min-w-0 flex-1">
            <small className="block text-xs text-muted">{student.code} · {student.gender === 'female' ? 'Nữ' : 'Nam'}</small>
            <h1 className="mt-0.5 text-h1 font-extrabold leading-tight text-ink max-[767px]:text-2xl">{student.fullName}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={STATUS_META[student.status].tone}>{STATUS_META[student.status].label}</Pill>
              <Pill tone={TUITION_META[student.tuition].tone}>{TUITION_META[student.tuition].label}</Pill>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
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
        <div className="sticky bottom-0 -mx-1 rounded-[var(--radius-panel)] bg-surface/90 p-3 shadow-card backdrop-blur-md">
          <TuitionRemindButton studentId={student.id} debt={student.debt} />
        </div>
      )}
    </section>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-bg px-3 py-2.5 text-center">
      <b className="block truncate text-md text-ink">{value}</b>
      <small className="mt-0.5 block text-xs text-muted">{label}</small>
    </div>
  );
}

function Row({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right font-bold ${tone}`}>{value}</dd>
    </div>
  );
}
