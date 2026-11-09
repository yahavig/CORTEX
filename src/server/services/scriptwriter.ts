// Writes reel scripts with Claude, from the formula + lessons book + Yahav's past scripts.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { MODE_LABELS, PILLAR_LABELS, SCRIPT_SECTIONS, SECTION_LABELS, type ScriptLine } from '../../shared/constants.ts';
import { VIDEOS_DIR } from '../config.ts';
import { db, schema } from '../db/index.ts';
import type { Job, Log } from '../jobs.ts';
import { getSetting } from '../routes/settings.ts';
import { runClaude } from './claude.ts';
import { DEFAULT_FORMULA } from './formula.ts';
import { activeLessons, lessonsAsMarkdown } from './lessons.ts';

type Script = typeof schema.scripts.$inferSelect;
type Video = typeof schema.videos.$inferSelect;

export const SCRIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hookOptions', 'hook', 'lines', 'caption', 'source', 'notes'],
  properties: {
    hookOptions: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: '3 different opening lines, Hebrew' },
    hook: { type: 'string', description: 'The chosen hook (one of hookOptions), used as the first line' },
    lines: {
      type: 'array',
      minItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['section', 'tag', 'text', 'visual'],
        properties: {
          section: { type: 'string', enum: [...SCRIPT_SECTIONS] },
          tag: { type: 'string', description: 'ElevenLabs v3 audio tag in English, without brackets' },
          text: { type: 'string', description: 'Spoken Hebrew line' },
          visual: { type: 'string', description: 'Hebrew: what is on screen for this line' },
        },
      },
    },
    caption: { type: 'string', description: 'Instagram post caption, Hebrew' },
    source: { type: 'string', description: 'Study citation for the screen: authors, venue, year, sample, honest scope. Empty if none verified.' },
    notes: { type: 'string', description: 'Hebrew notes for Yahav: what to verify, why this hook, open questions' },
  },
} as const;

interface ScriptOut {
  hookOptions: string[];
  hook: string;
  lines: ScriptLine[];
  caption: string;
  source: string;
  notes: string;
}

export function renderBody(lines: ScriptLine[]) {
  return lines.map((l) => `[${l.tag}] ${l.text}`).join('\n\n');
}

// Yahav's own finished scripts (SCRIPT*.md in the video projects), newest first.
function styleExamples(limit = 2): string[] {
  if (!existsSync(VIDEOS_DIR)) return [];
  const files: { path: string; mtime: number }[] = [];
  for (const dir of readdirSync(VIDEOS_DIR)) {
    const full = join(VIDEOS_DIR, dir);
    if (!statSync(full).isDirectory()) continue;
    for (const f of readdirSync(full)) if (/^SCRIPT.*\.md$/i.test(f)) files.push({ path: join(full, f), mtime: statSync(join(full, f)).mtimeMs });
  }
  return files
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map((f) => readFileSync(f.path, 'utf8').slice(0, 6000));
}

function systemPrompt(formula: string) {
  return `You are the scriptwriter for Yahav Guetta, an Israeli creator of Hebrew Instagram/TikTok reels about Apple, technology, and the brain & habits. You write voiceover scripts that Yahav records in ElevenLabs (v3, with audio tags) and turns into neon-style illustrated reels.

Follow Yahav's formula and style exactly:

${formula}

Rules:
- Write in natural spoken Hebrew. Never translate English idioms literally.
- Every line has exactly one section: ${SCRIPT_SECTIONS.map((s) => `${s} (${SECTION_LABELS[s]})`).join(', ')}. Sections appear in that order. The hook is 1 line, the promise 1–2 lines, then the mechanism, then research, then the challenge.
- Research honesty: use web search to find and verify a real study that supports the mechanism. Cite only what you verified (authors, venue, year, sample size). Describe its finding without exaggeration. If you can't verify one, leave "source" empty, skip the research line, and say so in notes. Never invent a study.
- "visual": for footage videos, write "צילום" when Yahav is on camera, or a short illustration beat (one object/metaphor, minimal) only where explanation helps. For voice-only videos, every line needs an illustration beat.
- Learn from the lessons book when it has entries. Confirmed lessons are rules; hypotheses are worth trying.
- Respond only with the JSON object.`;
}

function buildPrompt(video: Video, previous: Script | undefined, feedback: string | undefined) {
  const parts: string[] = [];
  parts.push(`# הסרטון\n\nכותרת/רעיון: ${video.title}`);
  if (video.pillar) parts.push(`תחום: ${PILLAR_LABELS[video.pillar]}`);
  parts.push(`סוג: ${MODE_LABELS[video.mode]}`);
  if (video.mechanism) parts.push(`המנגנון: ${video.mechanism}`);
  if (video.hookType) parts.push(`סוג הוק מבוקש: ${video.hookType}`);
  if (video.notes) parts.push(`הערות של יהב:\n${video.notes}`);
  if (video.isExperiment && video.experimentNote) parts.push(`זה ניסוי: ${video.experimentNote}`);

  parts.push(`# ספר הלקחים\n\n${lessonsAsMarkdown(activeLessons())}`);

  const examples = styleExamples();
  if (examples.length) parts.push(`# תסריטים קודמים של יהב (לסגנון בלבד, לא להעתיק)\n\n${examples.map((e, i) => `--- דוגמה ${i + 1} ---\n${e}`).join('\n\n')}`);

  if (previous) {
    parts.push(`# הגרסה הקודמת (v${previous.version})\n\n${renderBody(previous.lines ?? [])}\n\nכיתוב: ${previous.caption ?? ''}\nמקור: ${previous.source ?? ''}`);
  }
  parts.push(feedback ? `# מה לשנות\n\n${feedback}` : previous ? '# משימה\n\nכתוב גרסה משופרת.' : '# משימה\n\nכתוב את התסריט.');
  return parts.join('\n\n');
}

export async function generateScript(job: Job, log: Log) {
  const { feedback } = (job.input ?? {}) as { feedback?: string };
  const video = db.select().from(schema.videos).where(eq(schema.videos.id, job.videoId!)).get();
  if (!video) throw new Error('הסרטון נמחק');
  const previous = db.select().from(schema.scripts).where(eq(schema.scripts.videoId, video.id)).orderBy(desc(schema.scripts.version)).get();
  const formula = getSetting<string>('formula', DEFAULT_FORMULA);

  const out = await runClaude<ScriptOut>({
    systemPrompt: systemPrompt(formula),
    prompt: buildPrompt(video, previous, feedback?.trim() || undefined),
    schema: SCRIPT_SCHEMA,
    tools: ['WebSearch', 'WebFetch'],
    log,
  });

  const lines = out.lines.filter((l) => l.text?.trim());
  const row = db
    .insert(schema.scripts)
    .values({
      videoId: video.id,
      version: (previous?.version ?? 0) + 1,
      hook: out.hook,
      hookOptions: out.hookOptions,
      lines,
      body: renderBody(lines),
      caption: out.caption,
      source: out.source || null,
      notes: out.notes,
      feedback: feedback?.trim() || null,
      author: 'claude',
    })
    .returning()
    .get();
  if (video.stage === 'idea') db.update(schema.videos).set({ stage: 'script', updatedAt: new Date() }).where(eq(schema.videos.id, video.id)).run();
  log(`saved script v${row.version}`);
  return { scriptId: row.id, version: row.version };
}

// Approved script → SCRIPT.md in the project folder (when it exists), for the skill and ElevenLabs.
export function writeScriptFile(video: Video, script: Script): string | null {
  const dir = join(VIDEOS_DIR, video.slug);
  if (!existsSync(dir)) return null;
  const file = join(dir, 'SCRIPT.md');
  const md = [
    `# ${video.title}: script v${script.version}`,
    '',
    '## Post caption',
    script.caption ?? '',
    '',
    '## Voiceover (paste into ElevenLabs)',
    script.body,
    '',
    '## Source to show on screen',
    script.source ?? '',
    '',
    '## Storyboard',
    ...(script.lines ?? []).map((l, i) => `${i + 1}. [${SECTION_LABELS[l.section]}] ${l.visual ?? ''}`),
    '',
  ].join('\n');
  writeFileSync(file, md);
  return file;
}
