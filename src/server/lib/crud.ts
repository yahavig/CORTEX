// Generic list/create/update/delete routes for simple tables.
import type { Hono } from 'hono';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from '../db/index.ts';
import { parseFields, type Spec } from './fields.ts';

type Row = Record<string, unknown>;
interface Options {
  spec: Spec;
  orderBy?: SQLiteColumn;
  hasUpdatedAt?: boolean;
  // Fill derived fields (e.g. ILS amount) before saving.
  prepare?: (patch: Row, existing: Row | null) => Promise<Row> | Row;
  afterDelete?: (row: Row) => void;
}

export function crud(app: Hono, path: string, table: SQLiteTable & { id: SQLiteColumn }, opts: Options) {
  const t = table as any;
  const byId = (id: number) => db.select().from(t).where(eq(t.id, id)).get() as Row | undefined;

  app.get(path, (c) => {
    let q = db.select().from(t).$dynamic();
    const where: SQL[] = [];
    for (const [k, v] of Object.entries(c.req.query())) if (k.endsWith('Id') && t[k] && v) where.push(eq(t[k], Number(v)));
    if (where.length) q = q.where(and(...where));
    return c.json(q.orderBy(desc(opts.orderBy ?? t.id)).all());
  });

  app.post(path, async (c) => {
    const parsed = parseFields((await c.req.json().catch(() => ({}))) as Row, opts.spec, true);
    if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
    const values = opts.prepare ? await opts.prepare(parsed, null) : parsed;
    return c.json(db.insert(t).values(values).returning().get(), 201);
  });

  app.patch(`${path}/:id`, async (c) => {
    const id = Number(c.req.param('id'));
    const existing = byId(id);
    if (!existing) return c.json({ error: 'not found' }, 404);
    const parsed = parseFields((await c.req.json().catch(() => ({}))) as Row, opts.spec);
    if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
    const values = opts.prepare ? await opts.prepare(parsed, existing) : parsed;
    if (opts.hasUpdatedAt !== false) values.updatedAt = new Date();
    return c.json(db.update(t).set(values).where(eq(t.id, id)).returning().get());
  });

  app.delete(`${path}/:id`, (c) => {
    const id = Number(c.req.param('id'));
    const row = byId(id);
    if (!row) return c.json({ error: 'not found' }, 404);
    db.delete(t).where(eq(t.id, id)).run();
    opts.afterDelete?.(row);
    return c.json({ ok: true });
  });
}
