import { Hono } from 'hono';
import { check, connect, disconnect, listAccounts, PROVIDERS, secretFor, type Provider } from './service.ts';
import { instagram } from './providers.ts';

export const routes = new Hono();
const valid = (p: string): p is Provider => (PROVIDERS as readonly string[]).includes(p);

routes.get('/api/accounts', (c) => c.json(listAccounts()));

routes.post('/api/accounts/:provider/connect', async (c) => {
  const p = c.req.param('provider');
  if (!valid(p)) return c.json({ error: 'unknown provider' }, 404);
  const { secret } = (await c.req.json().catch(() => ({}))) as { secret?: string };
  try {
    return c.json(await connect(p, secret));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

routes.post('/api/accounts/:provider/check', async (c) => {
  const p = c.req.param('provider');
  return valid(p) ? c.json(await check(p)) : c.json({ error: 'unknown provider' }, 404);
});

routes.delete('/api/accounts/:provider', async (c) => {
  const p = c.req.param('provider');
  if (!valid(p)) return c.json({ error: 'unknown provider' }, 404);
  await disconnect(p);
  return c.json({ ok: true });
});

// Recent posts, to pick which reel an automation listens on.
routes.get('/api/accounts/instagram/media', async (c) => {
  const token = await secretFor('instagram');
  if (!token) return c.json({ error: 'Instagram לא מחובר' }, 400);
  try {
    return c.json(await instagram.media(token));
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});
