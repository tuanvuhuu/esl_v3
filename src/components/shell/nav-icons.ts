// Ánh xạ khoá icon trong lib/nav.ts sang icon thật của lucide-react. Chỉ dùng ở phía client.
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  Contact,
  History,
  House,
  IdCard,
  Library,
  MessageCircle,
  Settings,
  ShieldCheck,
  Upload,
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
  library: Library,
  history: History,
  wallet: Wallet,
  chart: ChartColumn,
  building: Building2,
  settings: Settings,
  shield: ShieldCheck,
  upload: Upload,
  message: MessageCircle,
};
