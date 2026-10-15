// Validate form cơ sở. Dùng ở server action.
import { z } from 'zod';

export const campusFormSchema = z.object({
  name: z
    .string({ error: 'Vui lòng nhập tên cơ sở' })
    .trim()
    .min(2, 'Tên cơ sở cần ít nhất 2 ký tự')
    .max(120, 'Tên cơ sở tối đa 120 ký tự'),
  address: z.string().trim().max(200, 'Địa chỉ tối đa 200 ký tự').default(''),
});

export type CampusFormInput = z.infer<typeof campusFormSchema>;
