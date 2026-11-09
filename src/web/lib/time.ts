import type { Slot, Stage } from '../../shared/constants.ts';
import { VIDEO_STAGES } from '../../shared/constants.ts';
import type { Video } from '../api.ts';

export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY = 86_400_000;

export const fmtDateTime = new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDay = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });
export const fmtTime = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
export const fmtFull = new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' });

export function startOfWeek(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function atTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

export function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// <input type="datetime-local"> works in local time without a zone.
export function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${hhmm(d)}`;
}
export function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : null;
}

export const stageIndex = (s: Stage) => VIDEO_STAGES.indexOf(s);

export interface Alert {
  level: 'warn' | 'info';
  text: string;
  videoId?: number;
  at?: Date;
}

// Things that need attention in the coming week.
export function computeAlerts(videos: Video[], slots: Slot[], now = new Date()): Alert[] {
  const alerts: Alert[] = [];
  const scheduled = videos.filter((v) => v.scheduledAt && v.stage !== 'published' && v.stage !== 'measured');

  for (const v of scheduled) {
    const at = new Date(v.scheduledAt!);
    if (at < now && v.stage === 'ready') {
      alerts.push({ level: 'warn', text: `"${v.title}": עבר זמן הפרסום. העלית? סמן כפורסם.`, videoId: v.id, at });
    } else if (at.getTime() - now.getTime() < 2 * DAY && stageIndex(v.stage) < stageIndex('ready')) {
      alerts.push({ level: 'warn', text: `"${v.title}" מתוזמן ל־${fmtDateTime.format(at)} ועדיין בשלב לא מוכן.`, videoId: v.id, at });
    }
  }

  for (let i = 0; i < 7; i++) {
    const day = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), i);
    for (const s of slots.filter((s) => s.weekday === day.getDay())) {
      const at = atTime(day, s.time);
      if (at < now) continue;
      const filled = videos.some((v) => v.scheduledAt && Math.abs(new Date(v.scheduledAt).getTime() - at.getTime()) < 60_000);
      if (!filled) alerts.push({ level: 'info', text: `משבצת ריקה: ${fmtDateTime.format(at)}`, at });
    }
  }
  return alerts.sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
}
