export type SectionId = 'home' | 'board' | 'week' | 'tasks' | 'scripts' | 'data' | 'automations' | 'business' | 'receipts' | 'accounts';

export type SectionGroup = 'create' | 'manage' | 'settings';
export const GROUP_LABELS: Record<SectionGroup, string> = { create: 'יצירה', manage: 'ניהול', settings: 'הגדרות' };

export interface Section {
  id: SectionId;
  group: SectionGroup;
  title: string;
  icon: string; // SF Symbol name
  phase: number;
  summary: string;
}

export const SECTIONS: Section[] = [
  { id: 'home', group: 'create', title: 'סקירה', icon: 'square.grid.2x2.fill', phase: 0, summary: 'מה דורש טיפול השבוע, ומה מתפרסם בקרוב' },
  { id: 'board', group: 'create', title: 'לוח תוכן', icon: 'rectangle.split.3x1.fill', phase: 1, summary: 'גרור כרטיסים בין השלבים. כשסרטון עובר ל"מוכן", הסרטון והכיתוב נשמרים ב־iCloud Drive ונוצרת תזכורת לשעת הפרסום.' },
  { id: 'week', group: 'create', title: 'לוח שבועי', icon: 'calendar', phase: 1, summary: 'משבצות הפרסום של השבוע. גרור סרטון למשבצת כדי לתזמן אותו.' },
  { id: 'scripts', group: 'create', title: 'תסריטים', icon: 'pencil.and.scribble', phase: 2, summary: 'Claude כותב לפי הנוסחה שלך וספר הלקחים, ובודק את המחקר ברשת. אתה בוחר הוק, עורך ומאשר לצילום.' },
  { id: 'data', group: 'create', title: 'נתונים ולקחים', icon: 'chart.line.uptrend.xyaxis', phase: 4, summary: 'מדידות אחרי 24 ו־72 שעות מה־Instagram API ומצילומי מסך, וספר לקחים' },
  { id: 'tasks', group: 'manage', title: 'משימות', icon: 'checklist', phase: 0, summary: 'כל מה שצריך לעשות: תוכן, עסק, מנהלה ומס.' },
  { id: 'automations', group: 'manage', title: 'אוטומציות', icon: 'bubble.left.and.bubble.right.fill', phase: 0, summary: 'תחליף ל־ManyChat: מילה בתגובה או בהודעה, ותשובה אוטומטית בפרטי עם לינק.' },
  { id: 'business', group: 'manage', title: 'עסק', icon: 'briefcase.fill', phase: 0, summary: 'הכנסות, הוצאות וקבלות, שיתופי פעולה, אנשי קשר, ותכנון מס הכנסה וביטוח לאומי.' },
  { id: 'receipts', group: 'manage', title: 'הפקת קבלות', icon: 'doc.text.fill', phase: 0, summary: 'תשלומים שהתקבלו וצריך להפיק להם קבלה, וקבלות שכבר הופקו.' },
  { id: 'accounts', group: 'settings', title: 'חשבונות מחוברים', icon: 'person.crop.circle.badge.checkmark', phase: 0, summary: 'Instagram, ElevenLabs ו־Claude Code. המפתחות נשמרים ב־Keychain.' },
];
