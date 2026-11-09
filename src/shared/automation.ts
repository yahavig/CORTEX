// Automations (ManyChat-style) — types and the pure matching logic.
// No I/O here: the same code can run in CORTEX or in a future always-on server.

export const TRIGGERS = ['comment', 'dm', 'story_reply', 'story_mention'] as const;
export type Trigger = (typeof TRIGGERS)[number];
export const TRIGGER_LABELS: Record<Trigger, string> = {
  comment: 'תגובה לפוסט',
  dm: 'הודעה פרטית',
  story_reply: 'תגובה לסטורי',
  story_mention: 'תיוג בסטורי',
};

export const MATCH_MODES = ['contains', 'exact', 'any'] as const;
export type MatchMode = (typeof MATCH_MODES)[number];
export const MATCH_MODE_LABELS: Record<MatchMode, string> = { contains: 'מכיל מילה', exact: 'בדיוק המילה', any: 'כל הודעה' };

export interface AutomationRule {
  id: number;
  name: string;
  enabled: boolean;
  trigger: Trigger;
  keywords: string[];
  matchMode: MatchMode;
  mediaIds: string[]; // empty = all posts (comment trigger only)
  publicReplies: string[]; // one is picked at random (comment trigger only)
  dmText: string;
  linkUrl: string | null;
  linkLabel: string | null;
  requireFollow: boolean;
  notFollowingText: string | null;
}

export interface IncomingEvent {
  trigger: Trigger;
  text: string;
  mediaId?: string | null;
  username?: string | null;
  follows?: boolean | null; // null = unknown
}

export interface Outcome {
  rule: AutomationRule;
  publicReply: string | null;
  dm: { text: string; linkUrl: string | null; linkLabel: string | null } | null;
  gatedByFollow: boolean; // sent the "follow first" message instead of the link
}

// Lowercase, drop Hebrew niqqud and punctuation, collapse spaces.
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Hebrew attaches prefixes to words (ה, ו, ב, כ, ל, מ, ש): "המדריך" should match "מדריך".
const PREFIX = /^[והבכלמש]{1,2}/;

function wordForms(word: string) {
  const forms = [word];
  const stripped = word.replace(PREFIX, '');
  if (stripped !== word && stripped.length >= 2) forms.push(stripped, word.slice(1));
  return forms;
}

function matchesText(rule: AutomationRule, text: string) {
  if (rule.matchMode === 'any') return true;
  const t = normalize(text);
  const forms = new Set(t.split(' ').flatMap(wordForms));
  return rule.keywords.some((k) => {
    const kw = normalize(k);
    if (!kw) return false;
    if (rule.matchMode === 'exact') return t === kw || wordForms(t).includes(kw);
    return kw.includes(' ') ? t.includes(kw) : forms.has(kw);
  });
}

export const fill = (template: string, e: IncomingEvent) => template.replaceAll('{{username}}', e.username ? `@${e.username}` : '');

// The first matching enabled rule wins; rules scoped to a specific post beat "all posts".
export function matchEvent(rules: AutomationRule[], e: IncomingEvent, random = Math.random): Outcome | null {
  const candidates = rules
    .filter((r) => r.enabled && r.trigger === e.trigger)
    .filter((r) => r.trigger !== 'comment' || r.mediaIds.length === 0 || (!!e.mediaId && r.mediaIds.includes(e.mediaId)))
    .filter((r) => matchesText(r, e.text))
    .sort((a, b) => Number(b.mediaIds.length > 0) - Number(a.mediaIds.length > 0) || a.id - b.id);
  const rule = candidates[0];
  if (!rule) return null;

  const replies = rule.publicReplies.filter((r) => r.trim());
  const publicReply = rule.trigger === 'comment' && replies.length ? fill(replies[Math.floor(random() * replies.length)]!, e) : null;
  const gated = rule.requireFollow && e.follows === false;
  const dm = gated
    ? { text: fill(rule.notFollowingText || 'כדי לקבל את הלינק, עקבו אחריי ושלחו שוב 🙏', e), linkUrl: null, linkLabel: null }
    : rule.dmText.trim() || rule.linkUrl
      ? { text: fill(rule.dmText, e), linkUrl: rule.linkUrl, linkLabel: rule.linkLabel }
      : null;
  return { rule, publicReply, dm, gatedByFollow: gated };
}
