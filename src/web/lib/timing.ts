import type { ScriptLine } from '../../shared/constants.ts';

const LINE_GAP = 0.3; // seconds of breath between lines

export interface Timed extends ScriptLine {
  start: number;
  end: number;
}

export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function timeLines(lines: ScriptLine[], wps: number): Timed[] {
  let t = 0;
  return lines.map((l) => {
    const dur = wordCount(l.text) / wps;
    const timed = { ...l, start: t, end: t + dur };
    t += dur + LINE_GAP;
    return timed;
  });
}

export function sectionEnd(timed: Timed[], section: ScriptLine['section']) {
  const items = timed.filter((l) => l.section === section);
  return items.length ? items[items.length - 1]!.end : null;
}

export const fmtSec = (s: number) => `${s.toFixed(1)}״`;
