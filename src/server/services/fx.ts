// Representative exchange rates (שער יציג) from the Bank of Israel, cached per day.
// For a weekend/holiday date, the last rate published on or before it is used.
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db/index.ts';

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function ilsRate(currency: string, date: Date): Promise<{ rate: number; rateDate: string } | null> {
  if (currency === 'ILS') return { rate: 1, rateDate: iso(date) };
  const day = iso(date);
  const cached = db.select().from(schema.fxRates).where(and(eq(schema.fxRates.currency, currency), eq(schema.fxRates.date, day))).get();
  if (cached) return { rate: cached.rate, rateDate: cached.rateDate };

  const from = iso(new Date(date.getTime() - 10 * 86_400_000));
  const url = `https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0/RER_${currency}_ILS?startperiod=${from}&endperiod=${day}&format=csv`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const rows = (await res.text()).trim().split('\n').slice(1).map((l) => l.split(','));
    const last = rows.filter((r) => r[12] && r[13]).sort((a, b) => a[12]!.localeCompare(b[12]!)).pop();
    if (!last) return null;
    const out = { rate: Number(last[13]), rateDate: last[12]! };
    // Don't cache today's lookup if the day's rate may not be published yet.
    if (out.rateDate === day || day < iso(new Date())) {
      db.insert(schema.fxRates).values({ currency, date: day, ...out }).onConflictDoNothing().run();
    }
    return out;
  } catch {
    return null;
  }
}
