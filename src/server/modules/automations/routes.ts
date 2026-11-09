import { Hono } from 'hono';
import { desc } from 'drizzle-orm';
import { MATCH_MODES, TRIGGERS, matchEvent, type AutomationRule, type Trigger } from '../../../shared/automation.ts';
import { db } from '../../db/index.ts';
import { crud } from '../../lib/crud.ts';
import { automationEvents, automations } from './schema.ts';

export const routes = new Hono();

const list = { type: 'list' } as const;

crud(routes, '/api/automations', automations as never, {
  spec: {
    name: { type: 'text', required: true, max: 200 },
    enabled: { type: 'bool' },
    trigger: { type: 'enum', values: TRIGGERS },
    matchMode: { type: 'enum', values: MATCH_MODES },
    videoId: { type: 'ref' },
    dmText: { type: 'text', max: 1000 },
    linkUrl: { type: 'text', max: 2000 },
    linkLabel: { type: 'text', max: 40 },
    requireFollow: { type: 'bool' },
    notFollowingText: { type: 'text', max: 1000 },
    keywords: list,
    mediaIds: list,
    publicReplies: list,
  },
  orderBy: automations.id,
  prepare: (p) => {
    if ('linkUrl' in p && p.linkUrl && !/^https?:\/\//i.test(String(p.linkUrl))) p.linkUrl = `https://${p.linkUrl}`;
    return p;
  },
});

// Try a comment/DM against the saved rules, without sending anything.
routes.post('/api/automations/simulate', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { trigger?: Trigger; text?: string; mediaId?: string; username?: string; follows?: boolean | null };
  if (!body.trigger || !TRIGGERS.includes(body.trigger)) return c.json({ error: 'trigger: invalid' }, 400);
  const rules = db.select().from(automations).all() as unknown as AutomationRule[];
  const out = matchEvent(rules, { trigger: body.trigger, text: body.text ?? '', mediaId: body.mediaId ?? null, username: body.username ?? 'username', follows: body.follows ?? null });
  return c.json(out ? { matched: true, ruleId: out.rule.id, ruleName: out.rule.name, publicReply: out.publicReply, dm: out.dm, gatedByFollow: out.gatedByFollow } : { matched: false });
});

routes.get('/api/automations/events', (c) => c.json(db.select().from(automationEvents).orderBy(desc(automationEvents.createdAt)).limit(100).all()));

// Engine status: rules are stored; real-time replies need a webhook receiver (not set up yet).
routes.get('/api/automations/engine', (c) => c.json({ running: false, mode: null, note: 'webhook receiver not configured' }));
