// Runs Claude Code headless (`claude -p`) with the user's own login.
// Prompt goes in on stdin; structured output is validated by --json-schema.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { LIVE_DIR } from '../config.ts';
import type { Log } from '../jobs.ts';

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? join(homedir(), '.local/bin/claude');
const WORK_DIR = join(LIVE_DIR, 'claude-work'); // neutral cwd: no project CLAUDE.md
mkdirSync(WORK_DIR, { recursive: true });

export interface ClaudeRun<T> {
  prompt: string;
  systemPrompt: string;
  schema: object;
  tools?: string[]; // e.g. ['WebSearch', 'WebFetch']; none by default
  model?: string;
  timeoutMs?: number;
  log: Log;
}

export async function runClaude<T>({ prompt, systemPrompt, schema, tools = [], model = 'opus', timeoutMs = 6 * 60_000, log }: ClaudeRun<T>): Promise<T> {
  if (!existsSync(CLAUDE_BIN)) throw new Error(`Claude Code לא נמצא ב־${CLAUDE_BIN}`);
  const args = [
    '-p',
    '--output-format', 'json',
    '--json-schema', JSON.stringify(schema),
    '--system-prompt', systemPrompt,
    '--tools', tools.join(','),
    '--no-session-persistence',
    '--model', model,
  ];
  if (tools.length) args.push('--allowedTools', tools.join(','));
  log(`claude ${model}, tools: ${tools.join(',') || 'none'}, prompt ${prompt.length} chars`);

  const out = await new Promise<string>((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, args, { cwd: WORK_DIR, env: process.env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Claude לא סיים תוך ${Math.round(timeoutMs / 60_000)} דקות`));
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => (clearTimeout(timer), reject(e)));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (stderr.trim()) log(`stderr: ${stderr.trim().slice(0, 2000)}`);
      if (code !== 0 && !stdout.trim()) reject(new Error(`claude exited ${code}: ${stderr.slice(0, 500)}`));
      else resolve(stdout);
    });
    child.stdin.end(prompt);
  });

  let res: { is_error?: boolean; result?: string; structured_output?: unknown; total_cost_usd?: number; duration_ms?: number; num_turns?: number };
  try {
    res = JSON.parse(out);
  } catch {
    throw new Error(`תשובה לא צפויה מ־Claude: ${out.slice(0, 300)}`);
  }
  log(`claude done in ${Math.round((res.duration_ms ?? 0) / 1000)}s, ${res.num_turns ?? '?'} turns`);
  if (res.is_error) {
    const msg = res.result ?? 'unknown error';
    throw new Error(/not logged in|\/login/i.test(msg) ? 'Claude Code לא מחובר. הרץ בטרמינל: ~/.local/bin/claude ואז /login' : msg);
  }
  if (res.structured_output) return res.structured_output as T;
  try {
    return JSON.parse(res.result ?? '') as T;
  } catch {
    throw new Error(`Claude לא החזיר JSON תקין: ${(res.result ?? '').slice(0, 300)}`);
  }
}
