// Trạng thái nộp bài (chưa nộp, đã nộp, đã chấm) dạng nhãn màu. Dùng chung ở chấm bài và khu học sinh.
import { Pill, type Tone } from '@/components/ui/primitives';
import { SUBMISSION_LABELS } from '@/lib/validation/assignment';

const TONE: Record<keyof typeof SUBMISSION_LABELS, Tone> = { not_submitted: 'blush', submitted: 'butter', graded: 'mint' };

export function SubmissionPill({ status }: { status: keyof typeof SUBMISSION_LABELS }) {
  return <Pill tone={TONE[status]}>{SUBMISSION_LABELS[status]}</Pill>;
}
