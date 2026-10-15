'use server';

import { getCampusContext } from '@/lib/campus-context';
import { todayKeyVN } from '@/lib/datetime';
import { listAttentionGroups, type AttentionGroup } from '@/lib/queries/notifications';
import { getCurrentPermissions } from '@/lib/session';

// Việc cần chú ý cho chuông thông báo, trong cơ sở đang xem. Chỉ gồm nhóm mà người dùng có quyền xem.
export async function listNotificationsAction(): Promise<AttentionGroup[]> {
  const granted = new Set(await getCurrentPermissions());
  const { scope } = await getCampusContext();
  return listAttentionGroups(granted, todayKeyVN(), scope);
}
