// Validate danh sách từ (35.14). Dùng ở server action và form.
import { z } from 'zod';

const optionalId = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().int().positive().nullable());

export const wordListItemSchema = z.object({
  word: z.string().trim().min(1, 'Nhập từ').max(60, 'Từ tối đa 60 ký tự'),
  meaningVi: z.string().trim().max(120, 'Nghĩa tối đa 120 ký tự').default(''),
  emoji: z.string().trim().max(16, 'Emoji tối đa 16 ký tự').default(''),
  sentence: z.string().trim().max(200, 'Câu mẫu tối đa 200 ký tự').default(''),
  imageFileId: optionalId,
  audioFileId: optionalId,
  vocabItemId: optionalId,
});

export const wordListSchema = z.object({
  name: z.string().trim().min(2, 'Tên danh sách cần ít nhất 2 ký tự').max(120, 'Tên danh sách tối đa 120 ký tự'),
  classId: optionalId,
  lessonId: optionalId,
  items: z.array(wordListItemSchema).min(1, 'Danh sách cần ít nhất một từ').max(60, 'Mỗi danh sách tối đa 60 từ'),
});

export type WordListInput = z.input<typeof wordListSchema>;
export type WordListItemInput = z.input<typeof wordListItemSchema>;
