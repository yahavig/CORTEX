import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { Hono } from 'hono';
import { and, gte, lt } from 'drizzle-orm';
import {
  CONTENT_TYPES, CURRENCIES, DEAL_STAGES, DEFAULT_DEDUCTIBLE, DEFAULT_TAX, type ExpenseCategory, EXPENSE_CATEGORIES, PAYMENT_METHODS, type TaxSettings,
} from '../../shared/business.ts';
import { estimateTax } from '../../shared/taxcalc.ts';
import { BRAND_DIR } from '../config.ts';
import { db, schema } from '../db/index.ts';
import { crud } from '../lib/crud.ts';
import { ilsRate } from '../services/fx.ts';
import { getSetting, setSetting } from './settings.ts';

export const business = new Hono();
const BUSINESS_DIR = join(BRAND_DIR, 'business');
const round2 = (n: number) => Math.round(n * 100) / 100;

// Fill fxRate + amountIls for foreign-currency amounts.
async function withIls(patch: Record<string, unknown>, existing: Record<string, unknown> | null, dateKeys: string[]) {
  const merged = { ...existing, ...patch } as Record<string, any>;
  const touched = ['amount', 'currency', 'fxRate', ...dateKeys].some((k) => k in patch);
  if (!touched || merged.amount == null) return patch;
  const currency = merged.currency ?? 'ILS';
  let rate: number | null = 'fxRate' in patch && patch.fxRate ? Number(patch.fxRate) : null;
  if (currency === 'ILS') rate = 1;
  if (rate == null) {
    const date = dateKeys.map((k) => merged[k]).find(Boolean);
    const found = await ilsRate(currency, date ? new Date(date) : new Date());
    rate = found?.rate ?? null;
  }
  return { ...patch, fxRate: rate, amountIls: rate == null ? null : round2(Number(merged.amount) * rate) };
}

const money = { amount: { type: 'number', min: 0 }, currency: { type: 'enum', values: CURRENCIES }, fxRate: { type: 'number', min: 0 } } as const;

crud(business, '/api/brands', schema.brands, {
  spec: { name: { type: 'text', required: true, max: 200 }, category: { type: 'text' }, website: { type: 'text' }, instagram: { type: 'text' }, notes: { type: 'text' } },
});

crud(business, '/api/contacts', schema.contacts, {
  spec: {
    name: { type: 'text', required: true, max: 200 }, brandId: { type: 'ref' }, role: { type: 'text' }, company: { type: 'text' },
    email: { type: 'text' }, phone: { type: 'text' }, instagram: { type: 'text' }, notes: { type: 'text' },
  },
});

crud(business, '/api/deals', schema.deals, {
  spec: {
    title: { type: 'text', required: true, max: 300 }, brandId: { type: 'ref' }, contactId: { type: 'ref' },
    stage: { type: 'enum', values: DEAL_STAGES }, contentType: { type: 'enum', values: CONTENT_TYPES },
    amount: money.amount, currency: money.currency, deliverables: { type: 'text' }, usageRights: { type: 'text' },
    dueAt: { type: 'date' }, paymentTermsDays: { type: 'int', min: 0, max: 365 }, notes: { type: 'text' },
  },
  orderBy: schema.deals.updatedAt,
});

crud(business, '/api/payments', schema.payments, {
  spec: {
    ...money, amount: { type: 'number', min: 0, required: true }, dealId: { type: 'ref' }, brandId: { type: 'ref' }, description: { type: 'text' },
    fees: { type: 'number', min: 0 }, withholding: { type: 'number', min: 0 }, vatAmount: { type: 'number', min: 0 },
    method: { type: 'enum', values: PAYMENT_METHODS }, expectedAt: { type: 'date' }, receivedAt: { type: 'date' },
    receiptNumber: { type: 'text', max: 100 }, receiptIssuedAt: { type: 'date' }, receiptPath: { type: 'text' }, notes: { type: 'text' },
  },
  orderBy: schema.payments.createdAt,
  prepare: (p, e) => withIls(p, e, ['receivedAt', 'expectedAt']),
});

crud(business, '/api/expenses', schema.expenses, {
  spec: {
    ...money, amount: { type: 'number', min: 0, required: true }, date: { type: 'date' }, vendor: { type: 'text', required: true, max: 200 },
    description: { type: 'text' }, category: { type: 'enum', values: EXPENSE_CATEGORIES }, vatAmount: { type: 'number', min: 0 },
    deductiblePct: { type: 'int', min: 0, max: 100 }, isAsset: { type: 'bool' }, paymentMethod: { type: 'text' },
    filePath: { type: 'text' }, subscriptionId: { type: 'ref' }, notes: { type: 'text' },
  },
  orderBy: schema.expenses.date,
  prepare: async (p, e) => {
    // New expense: default date today, deductible share by category.
    const base = e ? {} : { date: p.date ?? new Date(), deductiblePct: DEFAULT_DEDUCTIBLE[(p.category as ExpenseCategory) ?? 'other'] };
    return withIls({ ...base, ...p }, e, ['date']);
  },
});

crud(business, '/api/subscriptions', schema.subscriptions, {
  spec: {
    vendor: { type: 'text', required: true }, plan: { type: 'text' }, category: { type: 'enum', values: EXPENSE_CATEGORIES },
    amount: { type: 'number', min: 0, required: true }, currency: money.currency, cycle: { type: 'enum', values: ['monthly', 'yearly'] },
    billingDay: { type: 'int', min: 1, max: 31 }, active: { type: 'bool' }, notes: { type: 'text' },
  },
  hasUpdatedAt: false,
});

business.get('/api/fx', async (c) => {
  const r = await ilsRate(c.req.query('currency') ?? 'USD', c.req.query('date') ? new Date(c.req.query('date')!) : new Date());
  return r ? c.json(r) : c.json({ error: 'לא נמצא שער' }, 404);
});

// ── Files (receipts) ── stored under yahav-brand/business, synced by iCloud.

const FILE_DIRS = { expense: 'expenses', receipt: 'receipts-issued' } as const;

business.post('/api/files', async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  const kind = String(form.kind ?? 'expense') as keyof typeof FILE_DIRS;
  if (!(file instanceof File) || !FILE_DIRS[kind]) return c.json({ error: 'file + kind required' }, 400);
  if (file.size > 30 * 1024 * 1024) return c.json({ error: 'קובץ גדול מ־30MB' }, 400);
  const date = form.date ? new Date(String(form.date)) : new Date();
  const ym = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  const dir = join(BUSINESS_DIR, FILE_DIRS[kind], ym);
  mkdirSync(dir, { recursive: true });
  const safe = basename(file.name).replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(-80) || `file${extname(file.name)}`;
  let path = join(dir, `${date.toISOString().slice(0, 10)} ${safe}`);
  for (let n = 2; existsSync(path); n++) path = join(dir, `${date.toISOString().slice(0, 10)} ${n} ${safe}`);
  writeFileSync(path, Buffer.from(await file.arrayBuffer()));
  return c.json({ path }, 201);
});

const inBusinessDir = (p: string) => resolve(p).startsWith(BUSINESS_DIR + '/');

business.get('/api/files', (c) => {
  const p = c.req.query('path') ?? '';
  if (!inBusinessDir(p) || !existsSync(p)) return c.notFound();
  const ext = extname(p).toLowerCase();
  const type = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.heic': 'image/heic', '.webp': 'image/webp' }[ext] ?? 'application/octet-stream';
  return c.body(readFileSync(p), 200, { 'Content-Type': type, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(basename(p))}` });
});

business.post('/api/files/reveal', async (c) => {
  const { path } = (await c.req.json().catch(() => ({}))) as { path?: string };
  if (!path || !inBusinessDir(path) || !existsSync(path)) return c.json({ error: 'not found' }, 404);
  execFile('open', ['-R', path]);
  return c.json({ ok: true });
});

// ── Tax settings & yearly summary ──

business.get('/api/settings/tax', (c) => c.json({ ...DEFAULT_TAX, ...getSetting<Partial<TaxSettings>>('tax', {}) }));
business.put('/api/settings/tax', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Partial<TaxSettings> | null;
  if (!body || typeof body !== 'object') return c.json({ error: 'expected object' }, 400);
  const merged = { ...DEFAULT_TAX, ...getSetting<Partial<TaxSettings>>('tax', {}), ...body };
  setSetting('tax', merged);
  return c.json(merged);
});

business.get('/api/business/summary', (c) => {
  const tax: TaxSettings = { ...DEFAULT_TAX, ...getSetting<Partial<TaxSettings>>('tax', {}) };
  const year = Number(c.req.query('year') ?? new Date().getFullYear());
  const from = new Date(year, 0, 1);
  const to = new Date(year + 1, 0, 1);
  const now = new Date();

  const income = db.select().from(schema.payments).where(and(gte(schema.payments.receivedAt, from), lt(schema.payments.receivedAt, to))).all();
  const allPayments = db.select().from(schema.payments).all();
  const expenses = db.select().from(schema.expenses).where(and(gte(schema.expenses.date, from), lt(schema.expenses.date, to))).all();

  const months = Array.from({ length: 12 }, () => ({ income: 0, expenses: 0, deductible: 0 }));
  let incomeTotal = 0, feesTotal = 0, withholdingTotal = 0, missingRates = 0, missingReceipts = 0;
  for (const p of income) {
    const ils = p.amountIls ?? (p.currency === 'ILS' ? p.amount : 0);
    if (p.amountIls == null && p.currency !== 'ILS') missingRates++;
    if (!p.receiptNumber) missingReceipts++;
    incomeTotal += ils;
    feesTotal += p.fees ?? 0;
    withholdingTotal += p.withholding ?? 0;
    months[p.receivedAt!.getMonth()]!.income += ils;
  }
  let expensesTotal = 0, deductibleTotal = 0, vatPaid = 0, missingFiles = 0;
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const ils = e.amountIls ?? (e.currency === 'ILS' ? e.amount : 0);
    if (e.amountIls == null && e.currency !== 'ILS') missingRates++;
    if (!e.filePath) missingFiles++;
    const ded = (ils * e.deductiblePct) / 100;
    expensesTotal += ils;
    deductibleTotal += ded;
    vatPaid += ((e.vatAmount ?? 0) * e.deductiblePct) / 100;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + ils;
    const m = months[e.date.getMonth()]!;
    m.expenses += ils;
    m.deductible += ded;
  }
  deductibleTotal += feesTotal; // payment-processor fees are an expense too

  const profit = incomeTotal - deductibleTotal;
  // Project the full year from the share of the year elapsed (at least one month).
  const elapsed = year < now.getFullYear() ? 1 : year > now.getFullYear() ? 0 : Math.max(1 / 12, (now.getTime() - from.getTime()) / (to.getTime() - from.getTime()));
  const projectedIncome = elapsed ? incomeTotal / elapsed : 0;
  const projectedProfit = elapsed ? profit / elapsed : 0;
  const estimate = estimateTax(projectedProfit, tax);
  const advancesMonthly = tax.advanceTaxMonthly + tax.advanceBlMonthly;

  const outstanding = allPayments
    .filter((p) => !p.receivedAt)
    .map((p) => ({ id: p.id, description: p.description, amount: p.amount, currency: p.currency, amountIls: p.amountIls, expectedAt: p.expectedAt, overdue: !!p.expectedAt && p.expectedAt < now }));

  // VAT if he were עוסק מורשה: output VAT on income minus recoverable VAT on expenses.
  const vatOutput = incomeTotal * tax.vatRate;

  return c.json({
    year,
    businessType: tax.businessType,
    income: round2(incomeTotal),
    expenses: round2(expensesTotal),
    deductible: round2(deductibleTotal),
    fees: round2(feesTotal),
    withholding: round2(withholdingTotal),
    profit: round2(profit),
    months: months.map((m) => ({ income: round2(m.income), expenses: round2(m.expenses), deductible: round2(m.deductible) })),
    byCategory,
    ceiling: { limit: tax.paturCeiling, used: round2(incomeTotal), pct: tax.paturCeiling ? incomeTotal / tax.paturCeiling : 0, projected: round2(projectedIncome) },
    projection: { elapsed, income: round2(projectedIncome), profit: round2(projectedProfit) },
    tax: estimate,
    advances: { monthly: advancesMonthly, gap: round2(estimate.monthlySetAside - advancesMonthly) },
    vatIfMurshe: { output: round2(vatOutput), input: round2(vatPaid), net: round2(vatOutput - vatPaid) },
    outstanding,
    issues: { missingRates, missingReceipts, missingFiles },
  });
});

// CSV for the accountant: every income and expense line of the year.
business.get('/api/business/export.csv', (c) => {
  const year = Number(c.req.query('year') ?? new Date().getFullYear());
  const from = new Date(year, 0, 1), to = new Date(year + 1, 0, 1);
  const income = db.select().from(schema.payments).where(and(gte(schema.payments.receivedAt, from), lt(schema.payments.receivedAt, to))).all();
  const expenses = db.select().from(schema.expenses).where(and(gte(schema.expenses.date, from), lt(schema.expenses.date, to))).all();
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : '');
  const rows = [
    ['סוג', 'תאריך', 'תיאור / ספק', 'קטגוריה', 'סכום', 'מטבע', 'שער', 'סכום ₪', 'מע״מ ₪', '% מוכר', 'עמלות ₪', 'ניכוי במקור ₪', 'מס׳ קבלה', 'קובץ'],
    ...income.map((p) => ['הכנסה', d(p.receivedAt), p.description, '', p.amount, p.currency, p.fxRate, p.amountIls, p.vatAmount, '', p.fees, p.withholding, p.receiptNumber, p.receiptPath]),
    ...expenses.map((e) => ['הוצאה', d(e.date), `${e.vendor}${e.description ? ` — ${e.description}` : ''}`, e.category, e.amount, e.currency, e.fxRate, e.amountIls, e.vatAmount, e.deductiblePct, '', '', '', e.filePath]),
  ];
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
  return c.body(csv, 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="cortex-${year}.csv"` });
});
