// Ánh xạ khoá icon trong lib/nav.ts sang icon thật của lucide-react. Chỉ dùng ở phía client.
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  Contact,
  History,
  House,
  IdCard,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { IconKey } from '@/lib/nav';

export const NAV_ICONS: Record<IconKey, LucideIcon> = {
  house: House,
  users: Users,
  contact: Contact,
  book: BookOpen,
  calendar: CalendarDays,
  idcard: IdCard,
  check: ClipboardCheck,
  clipboard: ClipboardList,
  history: History,
  wallet: Wallet,
  chart: ChartColumn,
  settings: Settings,
  shield: ShieldCheck,
};
