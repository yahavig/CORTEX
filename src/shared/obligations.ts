// What an עוסק פטור in Israel must do, as researched and cross-checked on 2026-11-18.
// Pure data: the obligations view renders it and the overview reads the deadlines.
// "verified" = stated by an official page or by at least two independent sources that agree.
// "check" = a single secondary source, conflicting sources, or an inference; confirm with the accountant.
// Update VERIFIED_AT and the figures each January.

export const VERIFIED_AT = '2026-11-18';

export type SourceId = 'kz-patur' | 'kz-zair' | 'kz-books' | 'btl-calc' | 'gov-1301' | 'brackets' | 'ceiling' | 'btl-guides' | 'pension' | 'influencers';

export const SOURCES: Record<SourceId, { name: string; url: string; official?: boolean }> = {
  'kz-patur': { name: 'כל זכות: עוסק פטור', url: 'https://www.kolzchut.org.il/he/%D7%A2%D7%95%D7%A1%D7%A7_%D7%A4%D7%98%D7%95%D7%A8' },
  'kz-zair': { name: 'כל זכות: עסק זעיר', url: 'https://www.kolzchut.org.il/he/%D7%A2%D7%A1%D7%A7_%D7%96%D7%A2%D7%99%D7%A8' },
  'kz-books': { name: 'כל זכות: ניהול ספרי החשבונות של העסק', url: 'https://www.kolzchut.org.il/he/%D7%A0%D7%99%D7%94%D7%95%D7%9C_%D7%A1%D7%A4%D7%A8%D7%99_%D7%94%D7%97%D7%A9%D7%91%D7%95%D7%A0%D7%95%D7%AA_%D7%A9%D7%9C_%D7%94%D7%A2%D7%A1%D7%A7' },
  'btl-calc': { name: 'ביטוח לאומי: חישוב דמי ביטוח לעצמאי', url: 'https://www.btl.gov.il/Insurance/National%20Insurance/type_list/Self_Employed/Pages/hishov.dmey.bituach.aspx', official: true },
  'gov-1301': { name: 'gov.il: דוח שנתי 2025 ליחידים (טופס 1301)', url: 'https://www.gov.il/he/service/reporting-and-payment-2025-annual-tax-report-for-individuals', official: true },
  brackets: { name: 'מדרגות המס 2026 אחרי הריווח (אדיר רו״ח)', url: 'https://adircpa.com/numbers/tax-brackets' },
  ceiling: { name: 'תקרת עוסק פטור 2026 (גיל הלוי גולד רו״ח)', url: 'https://www.gmcpa.co.il/2026/01/14/%D7%A2%D7%93%D7%9B%D7%95%D7%9F-%D7%AA%D7%A7%D7%A8%D7%AA-%D7%A2%D7%95%D7%A1%D7%A7-%D7%A4%D7%98%D7%95%D7%A8-%D7%9C%D7%A9%D7%A0%D7%AA-2026-%D7%9E%D7%94-%D7%96%D7%94-%D7%90%D7%95%D7%9E%D7%A8/' },
  'btl-guides': { name: 'ביטוח לאומי לעצמאי 2026 (ביזפורטל)', url: 'https://www.bizportal.co.il/guides/news/article/20039168' },
  pension: { name: 'פנסיה חובה לעצמאים 2026 (סופרמרקר)', url: 'https://supermarker.themarker.com/Pension/PensionObligationForIndependents.aspx' },
  influencers: { name: 'אכיפת מע״מ על משפיענים (וואלה כסף)', url: 'https://finance.walla.co.il/item/3531807' },
};

export type Status = 'verified' | 'check';

export interface Obligation {
  title: string;
  body: string;
  when?: string;
  status: Status;
  note?: string; // why it is marked "check", or a caveat
  sources: SourceId[];
}

export interface ObligationGroup {
  id: string;
  title: string;
  icon: string;
  items: Obligation[];
}

export const GROUPS: ObligationGroup[] = [
  {
    id: 'status',
    title: 'המעמד',
    icon: 'person.text.rectangle.fill',
    items: [
      {
        title: 'תקרת מחזור: 122,833 ₪ ב־2026',
        body: 'התקרה היא על המחזור, כל מה שנכנס, ולא על הרווח. ב־2025 היא הייתה 120,000 ₪, והיא מתעדכנת כל 1 בינואר.',
        status: 'verified',
        sources: ['kz-patur', 'ceiling'],
      },
      {
        title: 'חציית התקרה: מעבר לעוסק מורשה',
        body: 'כשהמחזור עובר את התקרה צריך לפנות למשרד מע״מ האזורי ולעבור לעוסק מורשה. מע״מ על הוצאות שהיו לפני המעבר לא מקזזים רטרואקטיבית.',
        status: 'verified',
        sources: ['kz-patur'],
      },
      {
        title: 'לא גובים מע״מ ולא מקזזים מע״מ',
        body: 'עוסק פטור לא מוסיף מע״מ ללקוחות ולא מקבל החזר על מע״מ בהוצאות. הוא לא פטור ממס הכנסה ומביטוח לאומי.',
        status: 'verified',
        sources: ['kz-patur'],
      },
    ],
  },
  {
    id: 'ongoing',
    title: 'שוטף, בכל תשלום',
    icon: 'doc.text.fill',
    items: [
      {
        title: 'קבלה מיד כשמתקבל תשלום',
        body: 'על כל תשלום מוציאים קבלה מיד עם קבלתו. עוסק פטור לא רשאי להוציא חשבונית מס. לפני התשלום אפשר לשלוח חשבונית עסקה, שהיא דרישת תשלום.',
        status: 'verified',
        sources: ['kz-patur', 'kz-books'],
      },
      {
        title: 'ניהול ספרים למס הכנסה',
        body: 'הפטור ממע״מ לא פוטר מניהול ספרים. מנהלים ספר תקבולים ותשלומים ורושמים כל תקבול מיד, אלא אם פקיד השומה נתן פטור או הקלה בכתב.',
        status: 'verified',
        sources: ['kz-books'],
      },
      {
        title: 'שמירת מסמכים 7 שנים',
        body: 'ספרים, רישומים ומסמכים, כולל קבלות על הוצאות, נשמרים 7 שנים.',
        status: 'verified',
        sources: ['kz-books'],
      },
      {
        title: 'מוצרים וברטר ממותגים',
        body: 'מוצר או שירות שמקבלים מותג בתמורה לחשיפה הוא כנראה הכנסה בשווה כסף, ונספר במחזור. רשות המסים בדקה ברטר אצל משפיענים.',
        status: 'check',
        note: 'זו הסקה מהעיקרון הכללי של מיסוי מתנות ומדיווח על האכיפה. לא נמצאה הנחיה רשמית ספציפית למשפיענים.',
        sources: ['influencers'],
      },
    ],
  },
  {
    id: 'income-tax',
    title: 'מס הכנסה',
    icon: 'building.columns.fill',
    items: [
      {
        title: 'מסלול עסק זעיר',
        body: 'במסלול הזה 30% מהמחזור מוכרים כהוצאה אוטומטית, בלי להציג קבלות, ו־70% חייבים במס. עוסק פטור חדש נרשם אליו אוטומטית אלא אם ביקש שלא. מי שיש לו הוצאות גבוהות מ־30% עדיף שיצא מהמסלול.',
        status: 'verified',
        note: 'כדאי לבדוק באזור האישי ברשות המסים באיזה מסלול אתה.',
        sources: ['kz-zair'],
      },
      {
        title: 'דוח שנתי',
        body: 'בעסק זעיר בדרך כלל לא מגישים דוח שנתי מלא, ומספיק דוח מקוצר מקוון. מחוץ למסלול מגישים דוח שנתי מלא (טופס 1301) עם דוח רווח והפסד.',
        when: 'דוח מקוצר: עד 31.3 בשנה שאחרי (לשנת 2025 היה עד 31.8.2026)',
        status: 'verified',
        note: 'מועדי הדוח המלא משתנים כל שנה בהודעות אורכה. את דף gov.il לא הצלחנו לקרוא ישירות.',
        sources: ['kz-zair', 'kz-patur', 'gov-1301'],
      },
      {
        title: 'מקדמות',
        body: 'בעסק זעיר ברוב המקרים לא משלמים מקדמות למס הכנסה. מחוץ למסלול פקיד השומה קובע שיעור מקדמה, ומשלמים עד ה־15 בחודש.',
        status: 'check',
        note: 'החלק על עסק זעיר אומת. מועד ה־15 לחודש מבוסס על ידע כללי ולא נבדק במקור רשמי.',
        sources: ['kz-zair'],
      },
      {
        title: 'מדרגות 2026 ונקודות זיכוי',
        body: 'שנתי: 10% עד 84,120 ₪, 14% עד 120,720, 20% עד 228,000, 31% עד 301,200, 35% עד 560,280, 47% מעל, ו־3% מס יסף מעל 721,560. מדרגות 20% ו־31% הורחבו בחוק במרץ 2026, רטרואקטיבית מינואר. נקודת זיכוי: 242 ₪ לחודש, 2.25 נקודות לגבר תושב.',
        status: 'verified',
        sources: ['brackets'],
        note: 'אומת בכמה מדריכים מקצועיים שתואמים זה לזה, לא בהודעה הרשמית עצמה.',
      },
    ],
  },
  {
    id: 'bl',
    title: 'ביטוח לאומי ובריאות',
    icon: 'cross.case.fill',
    items: [
      {
        title: 'רישום כעצמאי ומקדמות',
        body: 'עצמאי נרשם בביטוח לאומי ומשלם מקדמות לפי ההכנסה המשוערת. בסוף השנה הן מתואמות להכנסה בפועל.',
        status: 'verified',
        sources: ['btl-calc', 'kz-patur'],
      },
      {
        title: 'שיעורים 2026',
        body: '7.7% עד 7,703 ₪ לחודש (4.47% ביטוח לאומי ו־3.23% בריאות). 18% מעל, עד 51,910 ₪ (12.83% ו־5.17%). 52% מהחלק של ביטוח לאומי, בלי בריאות, מוכרים כניכוי ממס הכנסה.',
        status: 'verified',
        note: 'השיעורים ותקרת המופחת מדף ביטוח לאומי. התקרה העליונה של 51,910 ₪ משני מדריכים. שיעור הניכוי של 52% לא נבדק מחדש.',
        sources: ['btl-calc', 'btl-guides'],
      },
      {
        title: 'הכנסה מזערית',
        body: 'מי שהכנסתו נמוכה מכ־3,442 ₪ לחודש משלם לפי הכנסה מזערית.',
        status: 'check',
        note: 'מקור משני אחד.',
        sources: ['btl-guides'],
      },
    ],
  },
  {
    id: 'pension',
    title: 'פנסיה חובה',
    icon: 'banknote.fill',
    items: [
      {
        title: 'הפקדה לפנסיה',
        body: 'עצמאי בגילאי 21 עד 60, שרשום כעוסק לפחות חצי שנה, חייב להפקיד: 4.45% מההכנסה עד 6,884.5 ₪ לחודש (חצי שכר ממוצע), ו־12.55% מהחלק שמעל, עד 13,769 ₪. ההפקדה מזכה בניכוי ובזיכוי במס.',
        status: 'verified',
        note: 'השכר הממוצע 13,769 ₪ מאומת בדף ביטוח לאומי.',
        sources: ['pension', 'btl-calc'],
      },
    ],
  },
  {
    id: 'vat',
    title: 'מע״מ',
    icon: 'percent',
    items: [
      {
        title: 'הצהרה שנתית על המחזור',
        body: 'פעם בשנה מצהירים למע״מ על מחזור העסקאות של השנה הקודמת, באתר רשות המסים. אין דוחות מע״מ חודשיים.',
        when: 'עד 31.1 בכל שנה (את ההצהרה על 2025 אפשר היה להגיש עד 30.4.2026)',
        status: 'verified',
        sources: ['kz-patur'],
      },
    ],
  },
];

// Recurring dates (month is 1-12). Used for the "next up" strip and the overview.
export const DEADLINES: { label: string; month: number; day: number; status: Status }[] = [
  { label: 'הצהרה שנתית למע״מ על מחזור השנה הקודמת', month: 1, day: 31, status: 'verified' },
  { label: 'דוח מקוצר לעסק זעיר על השנה הקודמת', month: 3, day: 31, status: 'verified' },
];

export function nextDeadlines(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return DEADLINES.map((d) => {
    let at = new Date(today.getFullYear(), d.month - 1, d.day);
    if (at < today) at = new Date(today.getFullYear() + 1, d.month - 1, d.day);
    return { ...d, at, days: Math.round((at.getTime() - today.getTime()) / 86_400_000) };
  }).sort((a, b) => a.at.getTime() - b.at.getTime());
}
