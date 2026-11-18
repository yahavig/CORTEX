// "חובות מס": everything an עוסק פטור must do, from the researched data in shared/obligations.ts,
// with the verification status and sources of every item and the next fixed deadlines.
import { useEffect, useState } from 'react';
import { GROUPS, nextDeadlines, SOURCES, VERIFIED_AT, type Obligation } from '../../../shared/obligations.ts';
import { money, pct } from '../../lib/money.ts';
import { rest } from '../../lib/rest.ts';
import { Sym } from '../../components/Sym.tsx';
import { Card } from './Overview.tsx';
import type { Summary } from './Overview.tsx';

const fmtDate = (d: Date) => d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

function Badge({ status }: { status: Obligation['status'] }) {
  return status === 'verified' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-neon-green/12 px-2 py-0.5 text-subheadline font-semibold text-neon-green"><Sym name="checkmark.seal.fill" size={11} />אומת</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-neon-orange/12 px-2 py-0.5 text-subheadline font-semibold text-neon-orange"><Sym name="questionmark.circle.fill" size={11} />לבדוק עם רו״ח</span>
  );
}

function Item({ o }: { o: Obligation }) {
  return (
    <li className="border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-body font-semibold">{o.title}</h4>
        <Badge status={o.status} />
      </div>
      <p className="mt-1 text-callout text-ink/85">{o.body}</p>
      {o.when && <p className="mt-2 flex items-center gap-1.5 text-callout font-semibold"><Sym name="calendar.badge.clock" size={14} className="text-tint" />{o.when}</p>}
      {o.note && <p className="mt-2 text-subheadline text-muted">{o.note}</p>}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {o.sources.map((id) => (
          <a key={id} href={SOURCES[id].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-subheadline text-tint hover:underline">
            {SOURCES[id].name}{SOURCES[id].official && <span className="text-muted">(רשמי)</span>}
            <Sym name="arrow.up.right.square" size={11} />
          </a>
        ))}
      </div>
    </li>
  );
}

export function Obligations() {
  const year = new Date().getFullYear();
  const [sum, setSum] = useState<Summary | null>(null);
  useEffect(() => void rest.get<Summary>(`/api/business/summary?year=${year}`).then(setSum).catch(() => {}), [year]);
  const deadlines = nextDeadlines();
  const c = sum?.ceiling;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-title3 font-semibold">הבא בתור</h3>
          <ul className="space-y-3">
            {deadlines.map((d) => (
              <li key={d.label}>
                <div className="text-callout font-semibold">{d.label}</div>
                <div className="text-callout tabular-nums text-muted">{fmtDate(d.at)} · {d.days === 0 ? 'היום' : `עוד ${d.days} ימים`}</div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-subheadline text-muted">מקדמות, אם נקבעו לך, נוספות לזה. המועדים שלהן מופיעים בסקירה.</p>
        </Card>
        <Card>
          <h3 className="mb-3 text-title3 font-semibold">התקרה השנה</h3>
          {c ? (
            <>
              <div className="text-title1 font-semibold tabular-nums">{money(c.used)}</div>
              <p className="text-callout text-muted">מתוך {money(c.limit)} ({pct(c.pct)})</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-fill" role="progressbar" aria-valuenow={Math.round(c.pct * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full ${c.pct >= 0.9 ? 'bg-neon-orange' : 'bg-accent'}`} style={{ width: `${Math.min(100, c.pct * 100)}%` }} />
              </div>
              <p className="mt-2 text-subheadline text-muted">בקצב הנוכחי: {money(c.projected)} עד סוף השנה.</p>
            </>
          ) : <p className="text-callout text-muted">טוען…</p>}
        </Card>
      </div>

      {GROUPS.map((g) => (
        <Card key={g.id}>
          <h3 className="mb-4 flex items-center gap-2 text-title3 font-semibold"><Sym name={g.icon} size={18} className="text-tint" />{g.title}</h3>
          <ul>{g.items.map((o) => <Item key={o.title} o={o} />)}</ul>
        </Card>
      ))}

      <p className="text-subheadline text-muted">
        נבדק ב־{fmtDate(new Date(VERIFIED_AT))}. ״אומת״ פירושו שהמידע מופיע בעמוד רשמי או בשני מקורות לפחות שתואמים זה לזה. זה סיכום לתכנון, לא ייעוץ מס. הסכומים מתעדכנים כל ינואר, אז כדאי לוודא מול רו״ח.
      </p>
    </div>
  );
}
