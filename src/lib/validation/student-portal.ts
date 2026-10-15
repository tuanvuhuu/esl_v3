// Validate bài làm do học sinh nộp (P28). Chỉ có đáp án, chữ và tệp, không có điểm.
import { z } from 'zod';

export const studentAnswersSchema = z
  .array(
    z.object({
      itemId: z.number().int().positive(),
      selectedOptionId: z.number().int().positive().nullable(),
      answerText: z.string().trim().max(4000, 'Bài viết tối đa 4000 ký tự').default(''),
      fileId: z.number().int().positive().nullable(),
    }),
  )
  .max(200, 'Tối đa 200 câu một lần');
