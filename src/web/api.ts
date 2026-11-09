import type { LessonStatus, Mode, Pillar, PrepState, ScriptLine, Slot, Stage } from '../shared/constants.ts';

export interface Video {
  id: number;
  slug: string;
  title: string;
  stage: Stage;
  pillar: Pillar | null;
  mode: Mode;
  hookType: string | null;
  mechanism: string | null;
  notes: string | null;
  symbol: string | null;
  caption: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  alsoOnTiktok: boolean;
  reminderId: string | null;
  prep: PrepState | null;
  renderPath: string | null;
  thumbPath: string | null;
  isExperiment: boolean;
  experimentNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Script {
  id: number;
  videoId: number;
  version: number;
  hook: string | null;
  hookOptions: string[] | null;
  lines: ScriptLine[] | null;
  body: string;
  caption: string | null;
  source: string | null;
  notes: string | null;
  feedback: string | null;
  author: 'claude' | 'yahav';
  approved: boolean;
  createdAt: string;
}

export interface Job {
  id: number;
  kind: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  videoId: number | null;
  output: unknown;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface Lesson {
  id: number;
  rule: string;
  detail: string | null;
  status: LessonStatus;
  createdAt: string;
  updatedAt: string;
}

export type VideoPatch = Partial<Omit<Video, 'id' | 'createdAt' | 'updatedAt' | 'prep' | 'reminderId'>>;

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  videos: () => req<Video[]>('GET', '/api/videos'),
  createVideo: (v: VideoPatch & { title: string }) => req<Video>('POST', '/api/videos', v),
  updateVideo: (id: number, patch: VideoPatch) => req<Video>('PATCH', `/api/videos/${id}`, patch),
  prepare: (id: number) => req<Video>('POST', `/api/videos/${id}/prepare`),
  deleteVideo: (id: number) => req<{ ok: true }>('DELETE', `/api/videos/${id}`),
  projects: () => req<string[]>('GET', '/api/projects'),
  slots: () => req<Slot[]>('GET', '/api/settings/slots'),
  saveSlots: (slots: Slot[]) => req<Slot[]>('PUT', '/api/settings/slots', slots),
  scripts: (videoId: number) => req<Script[]>('GET', `/api/videos/${videoId}/scripts`),
  generateScript: (videoId: number, feedback?: string) => req<Job>('POST', `/api/videos/${videoId}/scripts/generate`, { feedback }),
  updateScript: (id: number, patch: Partial<Pick<Script, 'hook' | 'lines' | 'caption' | 'source'>>) => req<Script>('PATCH', `/api/scripts/${id}`, patch),
  approveScript: (id: number) => req<{ script: Script; video: Video; file: string | null }>('POST', `/api/scripts/${id}/approve`),
  deleteScript: (id: number) => req<{ ok: true }>('DELETE', `/api/scripts/${id}`),
  job: (id: number) => req<Job>('GET', `/api/jobs/${id}`),
  jobs: (videoId?: number) => req<Job[]>('GET', videoId ? `/api/jobs?videoId=${videoId}` : '/api/jobs'),
  lessons: () => req<Lesson[]>('GET', '/api/lessons'),
  createLesson: (l: Partial<Lesson> & { rule: string }) => req<Lesson>('POST', '/api/lessons', l),
  updateLesson: (id: number, l: Partial<Lesson>) => req<Lesson>('PATCH', `/api/lessons/${id}`, l),
  deleteLesson: (id: number) => req<{ ok: true }>('DELETE', `/api/lessons/${id}`),
  extractLessons: (text: string) => req<Job>('POST', '/api/lessons/extract', { text }),
  formula: () => req<{ formula: string; isDefault: boolean }>('GET', '/api/settings/formula'),
  saveFormula: (formula: string | null) => req<{ formula: string }>('PUT', '/api/settings/formula', { formula }),
  wps: () => req<{ wps: number }>('GET', '/api/settings/wps'),
  saveWps: (wps: number) => req<{ wps: number }>('PUT', '/api/settings/wps', { wps }),
  symbols: (q: string) => req<string[]>('GET', `/api/symbols?q=${encodeURIComponent(q)}`),
};
