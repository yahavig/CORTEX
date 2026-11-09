// Fonts and SF Symbols, served straight from where they already live on the Mac.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Hono } from 'hono';
import { SF_SYMBOLS_DIR } from '../config.ts';

const FONTS: Record<string, string> = {
  'sf-pro.ttf': '/Library/Fonts/SF-Pro.ttf',
  'sf-hebrew.ttf': '/Library/Fonts/SF-Hebrew.ttf',
};
const YEAR = 'public, max-age=31536000, immutable';

interface SymbolEntry { name: string; fill: string | null; keywords: string[]; categories: string[]; restricted: string | null }
let index: SymbolEntry[] | null = null;
const loadIndex = (): SymbolEntry[] => (index ??= JSON.parse(readFileSync(join(SF_SYMBOLS_DIR, "index.json"), "utf8")) as SymbolEntry[]);

export const assets = new Hono();

assets.get('/fonts/:file', (c) => {
  const path = FONTS[c.req.param('file')];
  if (!path || !existsSync(path)) return c.notFound();
  return c.body(readFileSync(path), 200, { 'Content-Type': 'font/ttf', 'Cache-Control': YEAR });
});

// White 1024px PNG per symbol; the UI uses it as a CSS mask so it takes any color.
assets.get('/api/symbols/:name{[a-z0-9.]+\\.png}', (c) => {
  const file = join(SF_SYMBOLS_DIR, 'white-1024', c.req.param('name'));
  if (!existsSync(file)) return c.notFound();
  return c.body(readFileSync(file), 200, { 'Content-Type': 'image/png', 'Cache-Control': YEAR });
});

// Search by name, keyword or category. Prefers the .fill variant.
assets.get('/api/symbols', (c) => {
  const q = (c.req.query('q') ?? '').trim().toLowerCase();
  if (!q) return c.json([]);
  // Name matches first, then keyword/category matches.
  const byName: string[] = [];
  const byMeta: string[] = [];
  const seen = new Set<string>();
  for (const s of loadIndex()) {
    if (s.restricted) continue;
    const name = s.fill ?? s.name;
    if (seen.has(name)) continue;
    if (s.name.includes(q)) byName.push(name), seen.add(name);
    else if (s.keywords.some((k) => k.includes(q)) || s.categories.includes(q)) byMeta.push(name), seen.add(name);
  }
  const out = [...byName, ...byMeta].slice(0, 80);
  return c.json(out);
});
