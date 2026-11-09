// Connected accounts: one card per service. Secrets go straight to the Keychain.
import { useEffect, useState, type ReactNode } from 'react';
import { rest } from '../../lib/rest.ts';
import { fmtFull, fmtDay } from '../../lib/time.ts';
import { Sym } from '../../components/Sym.tsx';
import { Button, inputCls } from '../../components/ui.tsx';

interface Account {
  provider: 'instagram' | 'elevenlabs' | 'claude';
  status: 'connected' | 'error' | 'disconnected';
  username?: string | null;
  meta?: Record<string, any> | null;
  connectedAt?: string | null;
  expiresAt?: string | null;
  checkedAt?: string | null;
  error?: string | null;
}

const INFO: Record<Account['provider'], { title: string; icon: string; color: string; uses: string; secretLabel?: string; help: ReactNode }> = {
  instagram: {
    title: 'Instagram',
    icon: 'camera.fill',
    color: 'from-[#fa3d9e] to-[#ff9f0a]',
    uses: 'אוטומציות DM ותגובות, ונתוני ביצועים לכל סרטון.',
    secretLabel: 'Access token',
    help: (
      <ol className="list-inside list-decimal space-y-1">
        <li>ב־<a className="underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a>: Create app, סוג Business.</li>
        <li>הוסף את המוצר <b>Instagram</b> ובחר <b>API setup with Instagram login</b>.</li>
        <li>תחת Generate access tokens: הוסף את החשבון שלך ולחץ <b>Generate token</b>.</li>
        <li>העתק את הטוקן והדבק כאן. CORTEX יחדש אותו לבד לפני שהוא פג.</li>
      </ol>
    ),
  },
  elevenlabs: {
    title: 'ElevenLabs',
    icon: 'waveform',
    color: 'from-[#3a3a3c] to-[#8e8e93]',
    uses: 'יצירת הקריינות ישירות מהתסריט (בהמשך), ומעקב אחרי מכסת התווים.',
    secretLabel: 'API key',
    help: <p>ב־elevenlabs.io: הפרופיל ← API Keys ← Create. הדבק את המפתח כאן.</p>,
  },
  claude: {
    title: 'Claude Code',
    icon: 'sparkles',
    color: 'from-[#d97757] to-[#b85c3c]',
    uses: 'כתיבת תסריטים, ספר הלקחים, וחילוץ פרטים מקבלות (בהמשך).',
    help: <p>Claude Code משתמש בהתחברות שלו. פעם אחת בטרמינל: <span dir="ltr" className="font-mono">~/.local/bin/claude</span> ואז <span dir="ltr" className="font-mono">/login</span>. אחר כך לחץ "בדוק חיבור".</p>,
  },
};

export function AccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => void rest.get<Account[]>('/api/accounts').then(setAccounts), []);
  const replace = (a: Account) => setAccounts((xs) => xs.map((x) => (x.provider === a.provider ? a : x)));

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-body text-muted">מפתחות וטוקנים נשמרים ב־Keychain של המק, לא בקבצים של CORTEX.</p>
      {accounts.map((a) => <Card key={a.provider} a={a} onChange={replace} />)}
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line p-5 text-body text-muted">
        <Sym name="music.note" size={18} />
        <div><b className="text-ink">TikTok</b> · נתונים בסיסיים בהמשך. TikTok לא מאפשר אוטומציית הודעות למפתחים פרטיים.</div>
      </div>
    </div>
  );
}

function Card({ a, onChange }: { a: Account; onChange: (a: Account) => void }) {
  const info = INFO[a.provider];
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function run(fn: () => Promise<Account>) {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
      setSecret('');
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const connect = () => run(() => rest.post<Account>(`/api/accounts/${a.provider}/connect`, { secret }));
  const check = () => run(() => rest.post<Account>(`/api/accounts/${a.provider}/check`, {}));
  const disconnect = () => run(async () => (await rest.remove('/api/accounts', a.provider as never), { provider: a.provider, status: 'disconnected' } as Account));

  const connected = a.status === 'connected';
  const daysLeft = a.expiresAt ? Math.round((new Date(a.expiresAt).getTime() - Date.now()) / 86_400_000) : null;

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <div className="flex items-center gap-6">
        <div className={`grid size-12 place-items-center rounded-[14px] bg-gradient-to-br text-white ${info.color}`}><Sym name={info.icon} size={22} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-title2 font-semibold">{info.title}</h3>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-subheadline ${connected ? 'bg-neon-green/15 text-neon-green' : a.status === 'error' ? 'bg-neon-pink/15 text-neon-pink' : 'bg-fill-strong text-muted'}`}>
              <span className="size-1.5 rounded-full bg-current" />
              {connected ? 'מחובר' : a.status === 'error' ? 'שגיאה' : 'לא מחובר'}
            </span>
          </div>
          <p className="text-callout text-muted">{connected && a.username ? `${a.provider === 'instagram' ? '@' : ''}${a.username} · ` : ''}{info.uses}</p>
        </div>
        {connected || a.status === 'error' ? (
          <div className="flex gap-2">
            <Button icon="arrow.clockwise" disabled={busy} onClick={check}>{busy ? 'בודק…' : 'בדוק'}</Button>
            {a.provider !== 'claude' && <Button tone="danger" disabled={busy} onClick={() => confirm(`לנתק את ${info.title}?`) && disconnect()}>נתק</Button>}
          </div>
        ) : (
          <Button tone="primary" icon={a.provider === 'claude' ? 'arrow.clockwise' : 'link'} disabled={busy} onClick={a.provider === 'claude' ? check : () => setOpen((o) => !o)}>
            {a.provider === 'claude' ? (busy ? 'בודק…' : 'בדוק חיבור') : 'חבר'}
          </Button>
        )}
      </div>

      {connected && a.meta && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-subheadline text-muted">
          {a.provider === 'instagram' && (
            <>
              {a.meta.accountType && <span>{a.meta.accountType}</span>}
              {a.meta.followers != null && <span>{Number(a.meta.followers).toLocaleString('he-IL')} עוקבים</span>}
              {daysLeft != null && <span className={daysLeft < 10 ? 'text-neon-orange' : ''}>הטוקן בתוקף עוד {daysLeft} ימים (מתחדש לבד)</span>}
            </>
          )}
          {a.provider === 'elevenlabs' && a.meta.characterLimit && (
            <>
              <span>{a.meta.tier}</span>
              <span>{Number(a.meta.characterCount).toLocaleString('he-IL')} / {Number(a.meta.characterLimit).toLocaleString('he-IL')} תווים</span>
              {a.meta.resetAt && <span>מתאפס ב־{fmtDay.format(new Date(a.meta.resetAt))}</span>}
            </>
          )}
          {a.checkedAt && <span>נבדק {fmtFull.format(new Date(a.checkedAt))}</span>}
        </div>
      )}
      {a.status === 'error' && a.error && <p className="mt-3 text-callout text-neon-pink">{a.error}</p>}

      {(open || (!connected && a.provider === 'claude')) && (
        <div className="mt-4 space-y-3 border-t border-line pt-4 text-callout text-muted">
          {info.help}
          {info.secretLabel && open && (
            <div className="flex gap-2">
              <input type="password" dir="ltr" autoComplete="off" className={inputCls} placeholder={info.secretLabel} value={secret} onChange={(e) => setSecret(e.target.value)} />
              <Button tone="primary" icon="checkmark" disabled={busy || !secret.trim()} onClick={connect}>{busy ? 'מתחבר…' : 'שמור'}</Button>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-callout text-neon-pink">{error}</p>}
    </section>
  );
}
