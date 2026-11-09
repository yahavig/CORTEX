// The lessons book: rules learned from what works. Mirrored to
// yahav-brand/lessons/lessons.md so Claude (and Yahav) can read it anywhere.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asc, inArray } from 'drizzle-orm';
import { LESSON_STATUS_LABELS } from '../../shared/constants.ts';
import { BRAND_DIR } from '../config.ts';
import { db, schema } from '../db/index.ts';
import type { Job, Log } from '../jobs.ts';
import { runClaude } from './claude.ts';

export type Lesson = typeof schema.lessons.$inferSelect;
export const LESSONS_MD = join(BRAND_DIR, 'lessons/lessons.md');

// Lessons that feed new scripts: confirmed first, then hypotheses.
export function activeLessons(): Lesson[] {
  return db
    .select()
    .from(schema.lessons)
    .where(inArray(schema.lessons.status, ['confirmed', 'hypothesis']))
    .orderBy(asc(schema.lessons.id))
    .all()
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'confirmed' ? -1 : 1));
}

export function lessonsAsMarkdown(lessons: Lesson[]) {
  if (lessons.length === 0) return '(ספר הלקחים עדיין ריק)';
  return lessons.map((l) => `- [${LESSON_STATUS_LABELS[l.status]}] ${l.rule}${l.detail ? ` — ${l.detail}` : ''}`).join('\n');
}

export function writeLessonsMd() {
  const all = db.select().from(schema.lessons).orderBy(asc(schema.lessons.id)).all();
  const group = (s: Lesson['status']) => all.filter((l) => l.status === s);
  const section = (title: string, items: Lesson[]) =>
    items.length ? `## ${title}\n\n${items.map((l) => `- ${l.rule}${l.detail ? `\n  ${l.detail}` : ''}`).join('\n')}\n` : '';
  const md = [
    '# ספר הלקחים',
    '',
    `_נוצר אוטומטית מ־CORTEX, ${new Date().toLocaleString('he-IL')}. לעריכה: CORTEX › תסריטים › ספר לקחים._`,
    '',
    section('מאושר', group('confirmed')),
    section('השערות', group('hypothesis')),
    section('הוצע (ממתין לאישור)', group('proposed')),
    section('הופרך', group('refuted')),
  ].join('\n');
  mkdirSync(join(BRAND_DIR, 'lessons'), { recursive: true });
  writeFileSync(LESSONS_MD, md);
}

// Turn a pasted manual analysis (Reel insights notes, past chats) into proposed lessons.

const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lessons'],
  properties: {
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['rule', 'detail'],
        properties: {
          rule: { type: 'string', description: 'Short actionable rule in Hebrew, about scripting/editing reels' },
          detail: { type: 'string', description: 'Hebrew: the evidence from the text (which video, which numbers)' },
        },
      },
    },
  },
} as const;

export async function extractLessons(job: Job, log: Log) {
  const { text } = job.input as { text: string };
  const existing = lessonsAsMarkdown(db.select().from(schema.lessons).all());
  const out = await runClaude<{ lessons: { rule: string; detail: string }[] }>({
    systemPrompt:
      'You help Yahav, a Hebrew reels creator, keep a "lessons book": short, actionable rules for writing and editing reels, each backed by evidence from his own performance data (retention, skip rate, watch time, shares, saves). Extract only lessons the text actually supports. Do not repeat lessons already in the book. Prefer 3–8 strong lessons over many weak ones. Respond only with JSON.',
    prompt: `# ספר הלקחים הנוכחי\n\n${existing}\n\n# הניתוח שיהב הדביק\n\n${text}`,
    schema: EXTRACT_SCHEMA,
    model: 'opus',
    log,
  });
  const rows = out.lessons.filter((l) => l.rule.trim()).map((l) => ({ rule: l.rule.trim(), detail: l.detail.trim() || null, status: 'proposed' as const }));
  if (rows.length) db.insert(schema.lessons).values(rows).run();
  writeLessonsMd();
  log(`proposed ${rows.length} lessons`);
  return { proposed: rows.length };
}
