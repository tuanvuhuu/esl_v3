'use client';

// Chọn từ trong kho từ (P36.4): trình độ, chủ đề, lưới từ chạm để chọn. Người có quyền Cài đặt thấy thêm "Chờ duyệt".
// Dữ liệu tải theo trình độ và chủ đề bằng server action, không gửi cả kho xuống trình duyệt.
import { Check, Zap } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { loadVocabAction, reviewVocabAction, type VocabLoad } from '@/app/(app)/bai-tap/vocab-actions';
import { LEVEL_LABELS, type LevelParams } from '@/lib/level-params';
import type { VocabWord } from '@/lib/queries/vocab';
import { topicLabel } from '@/lib/vocab-topics';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';

const LEVEL_CODES = ['Pre-A1', 'A1', 'A2'] as const;
const PENDING = '__pending__';

export function VocabPicker({
  level,
  onLevel,
  picked,
  onToggle,
  onPickMany,
}: {
  level: LevelParams;
  onLevel: (code: (typeof LEVEL_CODES)[number]) => void;
  picked: VocabWord[];
  onToggle: (w: VocabWord) => void;
  onPickMany: (ws: VocabWord[]) => void;
}) {
  const [topic, setTopic] = useState<string | null>(null);
  const [data, setData] = useState<VocabLoad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [reviewing, startReview] = useTransition();
  const [dropping, setDropping] = useState<VocabWord | null>(null);
  const [reload, setReload] = useState(0);
  const [allTopics, setAllTopics] = useState(false);

  useEffect(() => {
    startLoad(async () => {
      const r = await loadVocabAction(level.code, topic === PENDING ? null : topic);
      if (!r.ok) return setError(r.message);
      setError(null);
      setData(r);
    });
  }, [level.code, topic, reload]);

  const currentTopic = topic ?? data?.topics[0]?.topic ?? '';
  const showPending = topic === PENDING;
  const list = showPending ? (data?.pending ?? []) : (data?.words ?? []);
  const pickedIds = new Set(picked.map((w) => w.id));

  function review(w: VocabWord, approve: boolean) {
    startReview(async () => {
      const r = await reviewVocabAction(w.id, approve);
      if (!r.ok) setError(r.message);
      setDropping(null);
      setReload((n) => n + 1);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ChipGroup label="Trình độ">
        {LEVEL_CODES.map((c) => (
          <Chip key={c} selected={level.code === c} onClick={() => onLevel(c)}>
            {LEVEL_LABELS[c]}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label="Chủ đề">
        {/* Chủ đề đã có nghĩa tiếng Việt hiện trước; chủ đề chỉ có từ CEFR-J chưa có nghĩa gom vào "Chủ đề khác" */}
        {(data?.topics ?? []).filter((t) => allTopics || t.withMeaning > 0 || t.topic === currentTopic).map((t) => (
          <Chip key={t.topic || 'none'} selected={!showPending && currentTopic === t.topic} count={t.total} onClick={() => setTopic(t.topic)}>
            {topicLabel(t.topic)}
          </Chip>
        ))}
        {!allTopics && (data?.topics ?? []).some((t) => t.withMeaning === 0 && t.topic !== currentTopic) && (
          <Chip selected={false} onClick={() => setAllTopics(true)}>
            Chủ đề khác ({(data?.topics ?? []).filter((t) => t.withMeaning === 0 && t.topic !== currentTopic).length})
          </Chip>
        )}
        {data?.canApprove && data.pending.length > 0 && (
          <Chip selected={showPending} count={data.pending.length} onClick={() => setTopic(PENDING)}>
            Chờ duyệt
          </Chip>
        )}
      </ChipGroup>
      {error && <Alert inline>{error}</Alert>}
      {!showPending && (
        <div>
          <Btn onClick={() => onPickMany(list.filter((w) => w.vi).slice(0, 8))} disabled={loading || !list.some((w) => w.vi)}>
            <Zap className="size-4" aria-hidden />
            Chọn 8 từ hay gặp
          </Btn>
        </div>
      )}
      {showPending && <Notice>Từ giáo viên thêm vào kho chung. Duyệt thì mọi người dùng được; bỏ thì xoá khỏi kho.</Notice>}
      {!loading && data && list.length === 0 && <Notice>{showPending ? 'Không còn từ chờ duyệt.' : 'Chủ đề này chưa có từ ở trình độ đang chọn.'}</Notice>}

      <div role="group" aria-label="Từ có sẵn" aria-busy={loading} className={`grid grid-cols-2 gap-2 ${loading ? 'opacity-60' : ''}`}>
        {list.map((w) => {
          const on = pickedIds.has(w.id);
          if (showPending) {
            return (
              <div key={w.id} className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-ctl)] border border-line bg-surface p-2.5">
                <WordFace w={w} />
                <div className="grid grid-cols-2 gap-1.5">
                  <Btn variant="primary" onClick={() => review(w, true)} disabled={reviewing}>
                    Duyệt
                  </Btn>
                  <Btn variant="danger" onClick={() => setDropping(w)} disabled={reviewing}>
                    Bỏ
                  </Btn>
                </div>
              </div>
            );
          }
          return (
            <button
              key={w.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(w)}
              className={`flex min-h-[52px] min-w-0 items-center gap-2.5 rounded-[var(--radius-ctl)] border px-2.5 py-1.5 text-left transition-colors ${on ? 'border-primary-deep bg-primary-soft' : 'border-line bg-surface hover:bg-row-hover'}`}
            >
              <WordFace w={w} />
              <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-accent bg-accent text-white' : 'border-line'}`}>
                {on && <Check className="size-3.5" />}
              </span>
            </button>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!dropping}
        title="Bỏ từ này khỏi kho?"
        text={dropping ? `“${dropping.en}” (${dropping.vi}) sẽ bị xoá khỏi kho từ. Bài đã soạn không đổi.` : ''}
        confirmLabel="Bỏ từ"
        pending={reviewing}
        onCancel={() => setDropping(null)}
        onConfirm={() => dropping && review(dropping, false)}
      />
    </div>
  );
}

function WordFace({ w }: { w: VocabWord }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-stone text-[22px]">
        {w.emoji || '·'}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-md text-ink">{w.en}</b>
        <span className={`block truncate text-sm ${w.vi ? 'text-muted' : 'italic text-muted opacity-70'}`}>{w.vi || 'Chưa có nghĩa'}</span>
      </span>
    </span>
  );
}
