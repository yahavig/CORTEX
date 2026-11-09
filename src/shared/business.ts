// Business constants shared by server and web.

export const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_SYMBOLS: Record<Currency, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };

export const DEAL_STAGES = ['lead', 'negotiation', 'contract', 'delivered', 'receipt_issued', 'paid', 'lost'] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'פנייה',
  negotiation: 'משא ומתן',
  contract: 'הסכם',
  delivered: 'תוכן נמסר',
  receipt_issued: 'קבלה הוצאה',
  paid: 'שולם',
  lost: 'לא יצא',
};

export const CONTENT_TYPES = ['reel', 'story', 'post', 'package', 'ugc', 'other'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = { reel: 'רילס', story: 'סטורי', post: 'פוסט', package: 'חבילה', ugc: 'UGC', other: 'אחר' };

export const PAYMENT_METHODS = ['bank', 'paypal', 'wise', 'bit', 'cash', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { bank: 'העברה בנקאית', paypal: 'PayPal', wise: 'Wise', bit: 'ביט / פייבוקס', cash: 'מזומן', other: 'אחר' };

// Expense categories with a default deductible share. Defaults are a starting point;
// confirm partial deductions (phone, home office) with the accountant.
export const EXPENSE_CATEGORIES = ['equipment', 'software', 'production', 'marketing', 'education', 'phone', 'office', 'travel', 'professional', 'fees', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  equipment: 'ציוד',
  software: 'תוכנות ומנויים',
  production: 'הפקה',
  marketing: 'פרסום וקידום',
  education: 'קורסים והשתלמויות',
  phone: 'טלפון ואינטרנט',
  office: 'משרד בבית',
  travel: 'נסיעות',
  professional: 'רו״ח ושירותים מקצועיים',
  fees: 'עמלות',
  other: 'אחר',
};
export const DEFAULT_DEDUCTIBLE: Record<ExpenseCategory, number> = {
  equipment: 100, software: 100, production: 100, marketing: 100, education: 100,
  phone: 50, office: 25, travel: 100, professional: 100, fees: 100, other: 100,
};

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = { todo: 'לעשות', doing: 'בעבודה', done: 'בוצע' };
export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = { low: 'נמוכה', normal: 'רגילה', high: 'גבוהה' };
export const TASK_AREAS = ['content', 'business', 'admin', 'personal'] as const;
export type TaskArea = (typeof TASK_AREAS)[number];
export const TASK_AREA_LABELS: Record<TaskArea, string> = { content: 'תוכן', business: 'עסק', admin: 'מנהלה ומס', personal: 'אישי' };

// Tax model parameters. Values are the 2025 figures (frozen by law through 2027 for brackets
// and credit points). Editable in the UI; verify each January with the accountant.
export interface TaxSettings {
  year: number;
  businessType: 'patur' | 'murshe';
  paturCeiling: number; // annual turnover ceiling for עוסק פטור
  vatRate: number; // 0.18
  creditPoints: number; // נקודות זיכוי
  creditPointValue: number; // annual ₪ per point
  brackets: { upTo: number | null; rate: number }[]; // annual taxable income
  blReducedCeiling: number; // monthly income taxed at the reduced BL rate (60% of average wage)
  blMaxIncome: number; // monthly maximum insurable income
  blReducedRate: number; // BL + health, reduced tier
  blFullRate: number; // BL + health, full tier
  blDeductibleShare: number; // share of BL (non-health) payments deductible from taxable income
  advanceTaxMonthly: number; // מקדמות מס הכנסה you pay now
  advanceBlMonthly: number; // מקדמות ביטוח לאומי you pay now
  advanceFrequency: 'monthly' | 'bimonthly';
}

export const DEFAULT_TAX: TaxSettings = {
  year: 2026,
  businessType: 'patur',
  paturCeiling: 120_000,
  vatRate: 0.18,
  creditPoints: 2.25,
  creditPointValue: 2_904,
  brackets: [
    { upTo: 84_120, rate: 0.1 },
    { upTo: 120_720, rate: 0.14 },
    { upTo: 193_800, rate: 0.2 },
    { upTo: 269_280, rate: 0.31 },
    { upTo: 560_280, rate: 0.35 },
    { upTo: 721_560, rate: 0.47 },
    { upTo: null, rate: 0.5 },
  ],
  blReducedCeiling: 7_522,
  blMaxIncome: 50_695,
  blReducedRate: 0.0597,
  blFullRate: 0.1783,
  blDeductibleShare: 0.52,
  advanceTaxMonthly: 0,
  advanceBlMonthly: 0,
  advanceFrequency: 'monthly',
};
