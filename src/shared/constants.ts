// Shared by server (schema, validation) and web (labels, colors).

export const VIDEO_STAGES = ['idea', 'script', 'recording', 'editing', 'ready', 'published', 'measured'] as const;
export type Stage = (typeof VIDEO_STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  idea: 'רעיון',
  script: 'תסריט',
  recording: 'הקלטה',
  editing: 'עריכה',
  ready: 'מוכן',
  published: 'פורסם',
  measured: 'נמדד',
};

export const PILLARS = ['apple', 'tech', 'brain'] as const;
export type Pillar = (typeof PILLARS)[number];

export const PILLAR_LABELS: Record<Pillar, string> = { apple: 'אפל', tech: 'טכנולוגיה', brain: 'מוח והרגלים' };
// Squircle colors for thumbnails, one neon family per pillar.
export const PILLAR_COLORS: Record<Pillar | 'none', [string, string]> = {
  apple: ['#2aa0ff', '#5b5bff'],
  tech: ['#7b3dfa', '#c13dfa'],
  brain: ['#fa3d9e', '#ff7a45'],
  none: ['#3a3a3c', '#636366'],
};
export const PILLAR_SYMBOLS: Record<Pillar | 'none', string> = {
  apple: 'iphone',
  tech: 'cpu.fill',
  brain: 'brain.fill',
  none: 'lightbulb.fill',
};

export const VIDEO_MODES = ['footage', 'voice'] as const;
export type Mode = (typeof VIDEO_MODES)[number];
export const MODE_LABELS: Record<Mode, string> = { footage: 'צילום', voice: 'קול בלבד' };

// Weekly publishing slots. weekday: 0 = Sunday. time: "HH:MM" local.
export interface Slot {
  weekday: number;
  time: string;
}
export const DEFAULT_SLOTS: Slot[] = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, time: '18:00' }));

// Result of preparing a video for publishing (iCloud folder + reminder).
export interface PrepState {
  at: string;
  folder?: string;
  videoFile?: string | null;
  reminderId?: string | null;
  warnings: string[];
  error?: string;
}

// ── Scripts ────────────────────────────────────────────────────────────────

export const SCRIPT_SECTIONS = ['hook', 'promise', 'mechanism', 'research', 'challenge'] as const;
export type ScriptSection = (typeof SCRIPT_SECTIONS)[number];
export const SECTION_LABELS: Record<ScriptSection, string> = {
  hook: 'הוק',
  promise: 'הבטחה',
  mechanism: 'מנגנון',
  research: 'מחקר',
  challenge: 'אתגר',
};

// One voiceover line. `tag` is the ElevenLabs v3 audio tag, e.g. "curious, direct".
export interface ScriptLine {
  section: ScriptSection;
  tag: string;
  text: string;
  visual?: string; // what's on screen: talking head, or an illustration beat
}

export const LESSON_STATUSES = ['proposed', 'hypothesis', 'confirmed', 'refuted'] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];
export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  proposed: 'הוצע',
  hypothesis: 'השערה',
  confirmed: 'מאושר',
  refuted: 'הופרך',
};

// Hebrew narration pace used for timing checks (words per second). Calibrated later from real audio.
export const DEFAULT_WPS = 2.4;
