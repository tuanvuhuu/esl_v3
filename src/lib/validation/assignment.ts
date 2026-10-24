// Validate bài tập và chấm điểm. Dùng ở server action.
import { z } from 'zod';
import { karaokeWords, parseTimings } from '@/lib/karaoke';
import { isRealIsoDate } from './student';
import { CRITERIA_PER_ITEM, CRITERION_MAX_POINTS, ITEM_TYPES, SKILLS } from '@/lib/assignment-scoring';

export const SUBMISSION_STATUSES = ['not_submitted', 'submitted', 'graded'] as const;
export const SUBMISSION_LABELS: Record<(typeof SUBMISSION_STATUSES)[number], string> = {
  not_submitted: 'Chưa nộp',
  submitted: 'Đã nộp',
  graded: 'Đã chấm',
};

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const assignmentFormSchema = z.object({
  classId: z.coerce.number({ error: 'Vui lòng chọn lớp' }).int().positive('Vui lòng chọn lớp'),
  title: z.string({ error: 'Vui lòng nhập tiêu đề bài tập' }).trim().min(2, 'Tiêu đề cần ít nhất 2 ký tự').max(160, 'Tiêu đề tối đa 160 ký tự'),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự').default(''),
  dueDate: z
    .string({ error: 'Vui lòng chọn hạn nộp' })
    .min(1, 'Vui lòng chọn hạn nộp')
    .refine(isRealIsoDate, 'Ngày không hợp lệ'),
  dueTime: z.string({ error: 'Vui lòng chọn giờ nộp' }).regex(TIME, 'Giờ theo dạng HH:MM'),
  maxScore: z.coerce
    .number({ error: 'Điểm tối đa phải là số' })
    .int('Điểm tối đa phải là số nguyên')
    .min(1, 'Điểm tối đa ít nhất là 1')
    .max(100, 'Điểm tối đa tối đa 100'),
  // Bài giảng gắn với bài tập (không bắt buộc). Để trống là không gắn.
  lessonId: z.string().trim().default(''),
});

export type AssignmentFormInput = z.infer<typeof assignmentFormSchema>;

// Một dòng chấm điểm: trạng thái nộp, điểm (chỉ khi đã chấm), nhận xét
export const gradingRowSchema = z
  .object({
    studentId: z.number().int().positive(),
    status: z.enum(SUBMISSION_STATUSES),
    score: z.number().int().min(0).max(100).nullable(),
    feedback: z.string().trim().max(500, 'Nhận xét tối đa 500 ký tự').default(''),
  })
  .refine((v) => v.status !== 'graded' || v.score !== null, { message: 'Chấm điểm thì phải có điểm', path: ['score'] });

// Câu hỏi trong bài (P22, P35). Có thể kèm ảnh hoặc âm thanh riêng cho từng đáp án.
export const itemOptionSchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  label: z.string().trim().max(300, 'Đáp án tối đa 300 ký tự').default(''),
  imageFileId: z.number().int().positive().nullable().optional().default(null),
  audioFileId: z.number().int().positive().nullable().optional().default(null),
  isCorrect: z.boolean().default(false),
});

// Cặp ghép đôi cho câu hỏi dạng match (P35)
export const itemPairSchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  leftLabel: z.string().trim().max(300).default(''),
  leftImageFileId: z.number().int().positive().nullable().optional().default(null),
  rightLabel: z.string().trim().max(300).default(''),
  rightImageFileId: z.number().int().positive().nullable().optional().default(null),
});

// Tiêu chí chấm của câu viết hoặc nộp tệp (P23). Điểm câu bằng tổng điểm tối đa các tiêu chí.
export const criterionFormSchema = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1, 'Tên tiêu chí không được để trống').max(120, 'Tên tiêu chí tối đa 120 ký tự'),
  maxPoints: z
    .number({ error: 'Điểm tối đa của tiêu chí phải là số' })
    .int('Điểm tối đa của tiêu chí phải là số nguyên')
    .min(1, 'Điểm tối đa của tiêu chí ít nhất là 1')
    .max(CRITERION_MAX_POINTS, `Điểm tối đa của tiêu chí tối đa ${CRITERION_MAX_POINTS}`),
});

export const itemFormSchema = z
  .object({
    id: z.number().int().positive().nullable(),
    skill: z.enum(SKILLS, { error: 'Chọn kỹ năng cho câu này' }),
    itemType: z.enum(ITEM_TYPES, { error: 'Chọn loại câu' }),
    prompt: z.string().trim().max(2000, 'Nội dung câu hỏi tối đa 2000 ký tự').default(''),
    promptVi: z.string().trim().max(2000, 'Hướng dẫn tiếng Việt tối đa 2000 ký tự').default(''),
    passage: z.string().trim().max(8000, 'Đoạn đọc tối đa 8000 ký tự').default(''),
    points: z.number({ error: 'Điểm phải là số' }).int('Điểm phải là số nguyên').min(1, 'Điểm ít nhất là 1').max(100, 'Điểm tối đa 100'),
    audioFileId: z.number().int().positive().nullable().default(null),
    imageFileId: z.number().int().positive().nullable().default(null),
    modelAudioFileId: z.number().int().positive().nullable().default(null),
    referenceText: z.string().trim().max(2000, 'Văn bản mẫu tối đa 2000 ký tự').default(''),
    wordTimings: z.string().trim().max(4000).regex(/^(\d+(,\d+)*)?$/, 'Mốc từng từ không hợp lệ').default(''),
    maxSeconds: z.number().int().min(5).max(180).default(10),
    sourceLicense: z.string().trim().max(300).default(''),
    options: z.array(itemOptionSchema).max(6, 'Tối đa 6 đáp án').default([]),
    pairs: z.array(itemPairSchema).max(10, 'Tối đa 10 cặp ghép').default([]),
    criteria: z.array(criterionFormSchema).max(CRITERIA_PER_ITEM, `Tối đa ${CRITERIA_PER_ITEM} tiêu chí một câu`).default([]),
    // Câu chép từ ngân hàng (P24), để đếm số bài dùng câu đó
    bankQuestionId: z.number().int().positive().nullable().default(null),
  })
  .superRefine((v, ctx) => {
    // Mốc karaoke phải khớp số từ của câu mẫu; sửa câu mẫu thì chỉnh lại mốc hoặc bấm Chia đều
    if (v.wordTimings && parseTimings(v.wordTimings, karaokeWords(v.referenceText).length) === null) {
      ctx.addIssue({ code: 'custom', path: ['wordTimings'], message: 'Mốc từng từ không khớp câu mẫu. Bấm Chia đều hoặc chỉnh lại mốc.' });
    }
    if (!v.prompt && v.audioFileId === null && v.imageFileId === null && v.modelAudioFileId === null) {
      ctx.addIssue({ code: 'custom', path: ['prompt'], message: 'Nhập nội dung câu hỏi hoặc đính âm thanh/ảnh' });
    }
    if (v.itemType === 'choice' || v.itemType === 'picture_choice') {
      if (v.options.length < 2) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Cần ít nhất 2 đáp án lựa chọn' });
      if (v.options.filter((o) => o.isCorrect).length !== 1) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Chọn đúng một đáp án đúng' });
      if (v.criteria.length > 0) ctx.addIssue({ code: 'custom', path: ['criteria'], message: 'Câu tự chấm nên không có tiêu chí' });
    }
    if (v.itemType === 'match') {
      if (v.pairs.length < 2) ctx.addIssue({ code: 'custom', path: ['pairs'], message: 'Ghép đôi cần ít nhất 2 cặp' });
    }
    if (v.itemType === 'order') {
      if (!v.referenceText.trim()) ctx.addIssue({ code: 'custom', path: ['referenceText'], message: 'Nhập câu chuẩn để đối chiếu thứ tự đúng' });
    }
    if (v.itemType === 'gap_fill') {
      const hasOpts = v.options.some((o) => o.isCorrect);
      if (!v.referenceText.trim() && !hasOpts) {
        ctx.addIssue({ code: 'custom', path: ['referenceText'], message: 'Nhập đáp án đúng chấp nhận được' });
      }
    }
  })
  // Câu có tiêu chí: điểm câu lấy từ tổng điểm các tiêu chí, không nhập riêng
  .transform((v) => (v.criteria.length > 0 ? { ...v, points: v.criteria.reduce((sum, c) => sum + c.maxPoints, 0) } : v));

export const itemsPayloadSchema = z
  .array(itemFormSchema)
  .min(1, 'Bài tập cần ít nhất một câu hỏi')
  .max(60, 'Tối đa 60 câu trong một bài')
  .refine((items) => items.reduce((sum, i) => sum + i.points, 0) <= 100, { message: 'Tổng điểm các câu tối đa 100' });

// Điểm một tiêu chí trong bài làm. Null là chưa chấm tiêu chí đó.
export const criterionAnswerSchema = z.object({
  criterionId: z.number().int().positive(),
  points: z.number().int('Điểm phải là số nguyên').min(0, 'Điểm không âm').nullable(),
});

// Bài làm của một học sinh cho một câu. Điểm chỉ dùng cho câu viết và nộp tệp không có tiêu chí; trắc nghiệm tự chấm.
export const answerRowSchema = z.object({
  itemId: z.number().int().positive(),
  selectedOptionId: z.number().int().positive().nullable(),
  answerText: z.string().trim().max(4000, 'Bài viết tối đa 4000 ký tự').default(''),
  fileId: z.number().int().positive().nullable(),
  points: z.number().int('Điểm phải là số nguyên').min(0, 'Điểm không âm').nullable(),
  comment: z.string().trim().max(500, 'Nhận xét tối đa 500 ký tự').default(''),
  criterionPoints: z.array(criterionAnswerSchema).max(CRITERIA_PER_ITEM).default([]),
});

export const answersPayloadSchema = z.array(answerRowSchema).max(200, 'Tối đa 200 câu một lần');

// Chấm chéo: điểm chấm lại của một câu (tổng câu) và nhận xét ngắn
export const secondMarkSchema = z.object({
  points: z.number({ error: 'Nhập điểm chấm lại' }).int('Điểm phải là số nguyên').min(0, 'Điểm không âm').max(100, 'Điểm tối đa 100'),
  comment: z.string().trim().max(500, 'Nhận xét tối đa 500 ký tự').default(''),
});
