// Validate trình độ và ngưỡng trong Cài đặt (P27).
import { z } from 'zod';

const threshold = z.number().int('Ngưỡng là số nguyên').min(0, 'Ngưỡng từ 0 đến 100').max(100, 'Ngưỡng từ 0 đến 100').nullable();

// Ô ngưỡng để trống là trình độ đó không có ngưỡng lên (ví dụ trình độ cao nhất)
export const levelSettingSchema = z.object({
  name: z.string({ error: 'Nhập tên trình độ' }).trim().min(1, 'Nhập tên trình độ').max(80, 'Tên trình độ tối đa 80 ký tự'),
  thresholds: z.object({
    listening: threshold,
    speaking: threshold,
    reading: threshold,
    writing: threshold,
  }),
});
