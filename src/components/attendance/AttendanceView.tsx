'use client';

import {
  AlertIcon,
  BookIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  HistoryIcon,
  LocationIcon,
  PeopleIcon,
  PersonIcon,
  SearchIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from '@primer/octicons-react';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type ComponentType, type CSSProperties } from 'react';
import { saveAttendanceAction } from '@/app/(app)/diem-danh/actions';
import type { RosterRow, Mark } from '@/lib/queries/attendance';
import type { SessionRow } from '@/lib/queries/sessions';
import { dateKeyLabel, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import { ComboBox } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Chip, TextInput } from '@/components/ui/controls';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar, Pill, type Tone } from '@/components/ui/primitives';
import { Callout, EmptyPanel, Panel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';

// Bốn trạng thái điểm danh: nhãn, màu nền khi được chọn, màu chấm và icon Primer Octicons
const MARK_META: Record<
  Mark,
  {
    label: string;
    on: string;
    tone: Tone;
    dot: string;
    icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  }
> = {
  present: {
    label: 'Có mặt',
    on: 'border-[#16a34a]/45 bg-[var(--mint)] text-[var(--mint-ink)] shadow-2xs',
    tone: 'mint',
    dot: 'bg-[#16a34a]',
    icon: CheckCircleIcon,
  },
  late: {
    label: 'Trễ',
    on: 'border-[#d97706]/45 bg-[var(--butter)] text-[var(--butter-ink)] shadow-2xs',
    tone: 'butter',
    dot: 'bg-[#d97706]',
    icon: ClockIcon,
  },
  absent: {
    label: 'Vắng',
    on: 'border-[#dc2626]/45 bg-[var(--blush)] text-[var(--blush-ink)] shadow-2xs',
    tone: 'blush',
    dot: 'bg-[#dc2626]',
    icon: XCircleIcon,
  },
  excused: {
    label: 'Có phép',
    on: 'border-[#2563eb]/45 bg-[var(--lav)] text-[var(--lav-ink)] shadow-2xs',
    tone: 'lav',
    dot: 'bg-[#2563eb]',
    icon: ShieldCheckIcon,
  },
};
const MARKS: Mark[] = ['present', 'late', 'absent', 'excused'];

// Trạng thái buổi cho người điểm danh
function sessionStatus(s: SessionRow): { label: string; tone: Tone; dot: string } {
  if (s.status === 'cancelled') return { label: 'Đã huỷ', tone: 'blush', dot: 'bg-[#dc2626]' };
  if (s.status === 'done') return { label: 'Đã điểm danh', tone: 'mint', dot: 'bg-[#16a34a]' };
  if (s.isPast) return { label: 'Chưa điểm danh', tone: 'butter', dot: 'bg-[#d97706]' };
  return { label: 'Chưa đến giờ', tone: 'stone', dot: 'bg-[#64748b]' };
}

// Tỉ lệ phần trăm an toàn cho thanh tổng hợp
const pct = (n: number, total: number) => (total === 0 ? '0%' : `${(n / total) * 100}%`);

// Màn điểm danh chuẩn 01. TSUKUBA: thanh buổi học, thẻ #f7f8fa tổng hợp KPI, danh sách học sinh với cụm nút 32px/44px và thanh lưu nổi khi có thay đổi.
export function AttendanceView({
  classes,
  classId,
  sessions,
  session,
  roster,
  canRecord,
}: {
  classes: { id: number; name: string }[];
  classId: number;
  sessions: SessionRow[];
  session: SessionRow | null;
  roster: RosterRow[];
  canRecord: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();
  const initialMarks = useMemo<Record<number, Mark | null>>(
    () => Object.fromEntries(roster.map((r) => [r.id, r.mark])),
    [roster],
  );
  const [marks, setMarks] = useState<Record<number, Mark | null>>(initialMarks);
  const [query, setQuery] = useState('');

  const counts = MARKS.reduce<Record<Mark, number>>(
    (acc, m) => ({ ...acc, [m]: Object.values(marks).filter((v) => v === m).length }),
    { present: 0, late: 0, absent: 0, excused: 0 },
  );
  const marked = Object.values(marks).filter((v) => v !== null).length;
  const unmarked = roster.length - marked;
  const canMark = canRecord && !!session && session.status !== 'cancelled' && session.isPast;

  const changedCount = useMemo(
    () => roster.filter((r) => (marks[r.id] ?? null) !== (initialMarks[r.id] ?? null)).length,
    [roster, marks, initialMarks],
  );
  const isDirty = changedCount > 0;

  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [roster, query]);

  function go(next: { cls?: number; s?: number | null }) {
    const params = new URLSearchParams({ cls: String(next.cls ?? classId) });
    const sid = next.s === undefined ? session?.id : next.s;
    if (sid) params.set('s', String(sid));
    router.push(`/diem-danh?${params.toString()}`, { scroll: false });
  }

  function setMark(studentId: number, mark: Mark) {
    setMarks((prev) => ({ ...prev, [studentId]: prev[studentId] === mark ? null : mark }));
  }

  function markAllPresent() {
    setMarks(Object.fromEntries(roster.map((r) => [r.id, 'present' as Mark])));
  }

  function resetChanges() {
    setMarks(initialMarks);
  }

  function save() {
    if (!session) return;
    const entries = roster.flatMap((r) => (marks[r.id] ? [{ studentId: r.id, mark: marks[r.id] as Mark }] : []));
    startTransition(async () => {
      const r = await saveAttendanceAction(session.id, entries);
      notify(r.message ?? (r.ok ? 'Đã lưu điểm danh' : 'Không lưu được'));
      if (r.ok) router.refresh();
    });
  }

  const status = session ? sessionStatus(session) : null;

  return (
    <section className="flex flex-col gap-3">
      <PageHeader
        crumbs={['Đào tạo', 'Điểm danh']}
        title="Điểm danh"
        subtitle={session ? `${session.className} · ${sessions.length} buổi trong khoá` : undefined}
        actions={
          <ComboBox
            label="Chọn lớp"
            variant="bar"
            icon={<PeopleIcon size={14} className="text-[var(--fgColor-muted)]" aria-hidden />}
            value={String(classId)}
            onChange={(v) => {
              if (v) go({ cls: Number(v), s: null });
            }}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            auto
          />
        }
      />

      {/* Dải buổi học của lớp: bấm để chuyển buổi */}
      {sessions.length > 0 && (
        <div
          role="tablist"
          aria-label="Buổi học"
          className="flex gap-1.5 overflow-x-auto pb-1"
        >
          {sessions.map((s) => {
            const st = sessionStatus(s);
            const on = s.id === session?.id;
            return (
              <Chip
                key={s.id}
                tab
                selected={on}
                onClick={() => go({ s: s.id })}
                className={s.status === 'cancelled' ? 'opacity-70 line-through' : ''}
              >
                <span className={clsx('size-1.5 shrink-0 rounded-full', on ? 'bg-on-primary' : st.dot)} aria-hidden />
                Buổi {s.sessionNo}
                <span className="font-mono text-xs font-normal tabular-nums opacity-80">
                  {dateKeyLabel(s.dateKey).slice(0, 5)}
                </span>
              </Chip>
            );
          })}
        </div>
      )}

      {!session ? (
        <EmptyPanel title="Lớp này chưa có buổi học" hint="Tạo lịch học cho lớp ở màn Lịch học." />
      ) : (
        <>
          {/* Tsukuba Pure-White Session Header & KPI Card */}
          <section
            aria-label="Thông tin buổi điểm danh"
            className="tsukuba-rise overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow)]"
          >
            <div className="flex flex-col gap-3.5 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] px-4 py-3.5 max-[767px]:px-3.5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-[var(--borderRadius-medium)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep)] text-[var(--on-primary)] shadow-2xs ring-1 ring-inset ring-black/10">
                  <span className="font-mono text-base font-semibold leading-none tabular-nums">
                    {session.dateKey.slice(8, 10)}
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium leading-none opacity-95">
                    {weekdayLabel(weekdayOfKey(session.dateKey))}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-base font-semibold tabular-nums text-[var(--fgColor-default)]">
                      Buổi {session.sessionNo} · {session.timeLabel}
                    </b>
                    {status && <Pill tone={status.tone}>{status.label}</Pill>}
                    <span className="rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-[var(--ink-2)]">
                      {dateKeyLabel(session.dateKey)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--fgColor-muted)]">
                    <span className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--primary-deep)]">
                      <PeopleIcon size={11} aria-hidden />
                      {session.className}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--ink-2)]">
                      <PersonIcon size={12} className="text-[var(--fgColor-muted)]" aria-hidden />
                      {session.teacherName}
                    </span>
                    {session.room && (
                      <span className="inline-flex items-center gap-1 font-mono text-[var(--ink-2)]">
                        <LocationIcon size={12} className="text-[var(--fgColor-muted)]" aria-hidden />
                        {session.room}
                      </span>
                    )}
                    {session.topic && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <BookIcon size={12} aria-hidden />
                        {session.topic}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {canRecord && (
                <div className="grid grid-cols-2 gap-2 min-[768px]:flex min-[768px]:shrink-0">
                  <Btn leadingVisual={CheckCircleIcon} onClick={markAllPresent} disabled={!canMark}>
                    Có mặt cả lớp
                  </Btn>
                  <Btn variant="primary" leadingVisual={CheckIcon} loading={pending} onClick={save} disabled={!canMark || pending}>
                    {pending ? 'Đang lưu…' : 'Lưu điểm danh'}
                  </Btn>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 bg-[#fcfdff] p-4 dark:bg-transparent max-[767px]:p-3.5">
              {roster.length > 0 && (
                <>
                  <div className="flex h-2 overflow-hidden rounded-full bg-[#eef2f7] ring-1 ring-inset ring-black/[0.04] dark:bg-[var(--bgColor-muted)]">
                    <span className="h-full bg-[#16a34a] transition-all duration-200" style={{ width: pct(counts.present, roster.length) } as CSSProperties} />
                    <span className="h-full bg-[#d97706] transition-all duration-200" style={{ width: pct(counts.late, roster.length) } as CSSProperties} />
                    <span className="h-full bg-[#dc2626] transition-all duration-200" style={{ width: pct(counts.absent, roster.length) } as CSSProperties} />
                    <span className="h-full bg-[#2563eb] transition-all duration-200" style={{ width: pct(counts.excused, roster.length) } as CSSProperties} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <KpiPill icon={CheckCircleIcon} iconClass="text-[#16a34a] dark:text-[#3fb950]" label="Có mặt" value={counts.present} />
                    <KpiPill icon={ClockIcon} iconClass="text-[#d97706] dark:text-[#d29922]" label="Trễ" value={counts.late} />
                    <KpiPill icon={XCircleIcon} iconClass="text-[#dc2626] dark:text-[#f85149]" label="Vắng" value={counts.absent} />
                    <KpiPill icon={ShieldCheckIcon} iconClass="text-[#2563eb] dark:text-[#58a6ff]" label="Có phép" value={counts.excused} />
                    <KpiPill icon={AlertIcon} iconClass="text-[var(--fgColor-muted)]" label="Chưa điểm danh" value={unmarked} />
                    <span className="ml-auto font-mono text-xs font-medium tabular-nums text-[var(--ink-2)]">
                      Đã điểm danh {marked}/{roster.length}
                    </span>
                  </div>
                </>
              )}

              {session.status === 'cancelled' && (
                <Callout tone="danger">
                  Buổi đã huỷ{session.cancelReason ? `: ${session.cancelReason}` : ''}. Không điểm danh.
                </Callout>
              )}
              {!session.isPast && session.status !== 'cancelled' && (
                <Callout tone="info">Buổi này chưa diễn ra nên chưa điểm danh được.</Callout>
              )}
            </div>
          </section>

          {/* Danh sách học sinh điểm danh */}
          {roster.length === 0 ? (
            <EmptyPanel title="Lớp chưa có học sinh đang học" hint="Thêm học sinh vào lớp ở màn Học sinh." />
          ) : (
            <Panel
              title={`Danh sách học sinh (${roster.length})`}
              padded={false}
              action={
                roster.length > 5 ? (
                  <div className="w-56 max-[767px]:w-44">
                    <TextInput
                      leadingVisual={SearchIcon}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Tìm tên học sinh…"
                      aria-label="Tìm học sinh trong danh sách điểm danh"
                    />
                  </div>
                ) : undefined
              }
            >
              {filteredRoster.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--fgColor-muted)]">
                  Không tìm thấy học sinh phù hợp với từ khoá &ldquo;{query}&rdquo;.
                </div>
              ) : (
                <ul className="m-0 flex list-none flex-col divide-y divide-[var(--borderColor-muted)] p-0">
                  {filteredRoster.map((r, idx) => {
                    const mark = marks[r.id];
                    const shown = mark ? MARK_META[mark] : null;
                    return (
                      <li
                        key={r.id}
                        className="flex flex-col gap-2.5 px-4 py-3 transition-colors hover:bg-[#f8fafc] dark:hover:bg-[var(--bgColor-muted)]/40 max-[767px]:px-3.5 min-[960px]:flex-row min-[960px]:items-center min-[960px]:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="hidden w-5 shrink-0 text-right font-mono text-xs tabular-nums text-[var(--fgColor-muted)] min-[768px]:inline-block">
                            {idx + 1}
                          </span>
                          <Avatar name={r.fullName} seed={r.id} size="sm" quiet />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/hoc-sinh/${r.id}`}
                                data-link="true"
                                className="break-words text-sm font-semibold text-[var(--fgColor-default)] transition-colors hover:text-[var(--primary)] hover:underline"
                              >
                                {r.fullName}
                              </Link>
                              <Pill tone={shown ? shown.tone : 'stone'}>{shown ? shown.label : 'Chưa điểm danh'}</Pill>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--fgColor-muted)]">
                              {r.makeupFrom ? (
                                <Pill tone="lav">Học bù · từ lớp {r.makeupFrom}</Pill>
                              ) : (
                                <span className="font-mono tabular-nums">{r.sessionsDone} buổi đã học</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          role="group"
                          aria-label={`Điểm danh ${r.fullName}`}
                          className="grid shrink-0 grid-cols-4 gap-1 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[#f8fafc] p-1 dark:bg-[var(--bgColor-muted)]/80 min-[960px]:w-[23rem]"
                        >
                          {MARKS.map((m) => {
                            const on = mark === m;
                            const meta = MARK_META[m];
                            const Icon = meta.icon;
                            return (
                              <button
                                key={m}
                                type="button"
                                aria-pressed={on}
                                disabled={!canMark}
                                onClick={() => setMark(r.id, m)}
                                className={clsx(
                                  'inline-flex h-[var(--ctl-h)] items-center justify-center gap-1 rounded-[calc(var(--borderRadius-medium)-2px)] border px-1.5 text-xs font-semibold transition-colors max-[767px]:h-[var(--ctl-h-touch)] min-[480px]:px-2 disabled:opacity-40',
                                  on
                                    ? meta.on
                                    : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--ink-2)] hover:border-[var(--borderColor-accent-emphasis)] hover:text-[var(--fgColor-default)]',
                                )}
                              >
                                <Icon size={12} className="hidden shrink-0 min-[480px]:inline-block" aria-hidden />
                                <span>{meta.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}
        </>
      )}

      {/* Thanh lưu nổi dưới chân màn hình máy tính khi có thay đổi chưa lưu */}
      {canMark && isDirty && (
        <aside
          aria-label="Thay đổi điểm danh chưa lưu"
          className="tsukuba-rise sticky bottom-3 z-20 mt-1 hidden items-center justify-between gap-3 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-accent-emphasis)] bg-[var(--bgColor-default)]/95 px-4 py-2.5 shadow-[var(--lift)] backdrop-blur-md min-[768px]:flex"
        >
          <div className="flex items-center gap-2 text-sm text-[var(--fgColor-default)]">
            <span aria-hidden className="size-2 rounded-full bg-[var(--primary)]" />
            <span>
              Có <b className="font-mono font-semibold tabular-nums">{changedCount}</b> học sinh thay đổi trạng thái điểm danh chưa lưu
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" leadingVisual={HistoryIcon} onClick={resetChanges} disabled={pending}>
              Hoàn tác
            </Btn>
            <Btn variant="primary" leadingVisual={CheckIcon} loading={pending} onClick={save} disabled={pending}>
              {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Btn>
          </div>
        </aside>
      )}

      {/* Thanh hành động dính dưới trên điện thoại (P15.6) */}
      {canRecord && session && session.isPast && session.status !== 'cancelled' && (
        <aside
          aria-label="Thao tác điểm danh nhanh"
          className="sticky bottom-[calc(68px+var(--safe-b))] z-30 mt-3 flex items-center justify-between gap-2 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]/95 px-3.5 py-2.5 shadow-[var(--lift)] backdrop-blur-md min-[768px]:hidden"
        >
          <span className="text-xs tabular-nums text-[var(--fgColor-muted)]">
            Đã điểm danh <b className="font-semibold text-[var(--fgColor-default)]">{marked}/{roster.length}</b>
          </span>
          <div className="flex items-center gap-2">
            <Btn onClick={markAllPresent} disabled={!canMark} className="!h-[var(--chip-h-touch)] px-3 text-xs">
              Có mặt cả lớp
            </Btn>
            <Btn
              variant="primary"
              leadingVisual={CalendarIcon}
              onClick={save}
              disabled={!canMark || pending}
              className="!h-[var(--chip-h-touch)] px-3 text-xs"
            >
              {pending ? 'Đang lưu…' : 'Lưu'}
            </Btn>
          </div>
        </aside>
      )}

      <Toast message={message} />
      <span className="sr-only" aria-live="polite">
        {canRecord ? '' : 'Bạn không có quyền điểm danh.'}
      </span>
    </section>
  );
}

function KpiPill({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  iconClass: string;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2.5 py-1 text-xs tabular-nums text-[var(--ink-2)] shadow-2xs">
      <Icon size={12} className={clsx('shrink-0', iconClass)} aria-hidden />
      {label} <b className="font-mono font-semibold text-[var(--fgColor-default)]">{value}</b>
    </span>
  );
}
