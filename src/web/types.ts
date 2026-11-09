import type { ContentType, DealStage, ExpenseCategory, PaymentMethod, TaskArea, TaskPriority, TaskStatus } from '../shared/business.ts';

export interface Brand { id: number; name: string; category: string | null; website: string | null; instagram: string | null; notes: string | null; createdAt: string }
export interface Contact { id: number; brandId: number | null; name: string; role: string | null; company: string | null; email: string | null; phone: string | null; instagram: string | null; notes: string | null }
export interface Deal {
  id: number; brandId: number | null; contactId: number | null; title: string; stage: DealStage; contentType: ContentType | null;
  amount: number | null; currency: string; deliverables: string | null; usageRights: string | null; dueAt: string | null;
  paymentTermsDays: number | null; notes: string | null; createdAt: string; updatedAt: string;
}
export interface Payment {
  id: number; dealId: number | null; brandId: number | null; description: string | null; amount: number; currency: string;
  fxRate: number | null; amountIls: number | null; fees: number | null; withholding: number | null; vatAmount: number | null;
  method: PaymentMethod | null; expectedAt: string | null; receivedAt: string | null; receiptNumber: string | null;
  receiptIssuedAt: string | null; receiptPath: string | null; notes: string | null; createdAt: string;
}
export interface Expense {
  id: number; date: string; vendor: string; description: string | null; category: ExpenseCategory; amount: number; currency: string;
  fxRate: number | null; amountIls: number | null; vatAmount: number | null; deductiblePct: number; isAsset: boolean;
  paymentMethod: string | null; filePath: string | null; subscriptionId: number | null; notes: string | null;
}
export interface Subscription { id: number; vendor: string; plan: string | null; category: ExpenseCategory; amount: number; currency: string; cycle: 'monthly' | 'yearly'; billingDay: number | null; active: boolean; notes: string | null }
export interface Task {
  id: number; title: string; notes: string | null; status: TaskStatus; priority: TaskPriority; area: TaskArea;
  dueAt: string | null; videoId: number | null; dealId: number | null; doneAt: string | null; createdAt: string; updatedAt: string;
}
