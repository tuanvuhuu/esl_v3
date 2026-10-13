// Cài đặt trung tâm (bảng center_settings, một dòng id = 1). Chỉ chạy trên server.
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { centerSettings } from '@/db/schema';

export type CenterSettings = {
  centerName: string;
  address: string;
  hotline: string;
  email: string;
  workingHours: string;
  dueDay: number;
  lateFeePercent: number;
  currency: string;
  notifySmsBeforeDue: boolean;
  notifyWeeklyReport: boolean;
  notifyAbsentAlert: boolean;
  notifyNewClass: boolean;
};

export async function getCenterSettings(): Promise<CenterSettings> {
  const [row] = await db.select().from(centerSettings).where(eq(centerSettings.id, 1)).limit(1);
  if (!row) {
    return {
      centerName: 'ESL Center',
      address: '',
      hotline: '',
      email: '',
      workingHours: '',
      dueDay: 10,
      lateFeePercent: 5,
      currency: 'VND',
      notifySmsBeforeDue: true,
      notifyWeeklyReport: true,
      notifyAbsentAlert: true,
      notifyNewClass: false,
    };
  }
  return {
    centerName: row.centerName,
    address: row.address,
    hotline: row.hotline,
    email: row.email,
    workingHours: row.workingHours,
    dueDay: row.dueDay,
    lateFeePercent: row.lateFeePercent,
    currency: row.currency,
    notifySmsBeforeDue: row.notifySmsBeforeDue,
    notifyWeeklyReport: row.notifyWeeklyReport,
    notifyAbsentAlert: row.notifyAbsentAlert,
    notifyNewClass: row.notifyNewClass,
  };
}
