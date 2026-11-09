import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { inputCls } from './ui.tsx';
import { Sym } from './Sym.tsx';

const SUGGESTED = ['brain.fill', 'brain.head.profile.fill', 'iphone', 'applelogo', 'cpu.fill', 'bolt.fill', 'flame.fill', 'heart.fill', 'moon.fill', 'sun.max.fill', 'clock.fill', 'bell.fill', 'eye.fill', 'hand.raised.fill', 'figure.walk', 'bed.double.fill', 'cup.and.saucer.fill', 'gamecontroller.fill', 'chart.line.uptrend.xyaxis', 'sparkles'];

export function SymbolPicker({ value, onChange }: { value: string | null; onChange: (name: string) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<string[]>(SUGGESTED);

  useEffect(() => {
    if (!q.trim()) return setResults(SUGGESTED);
    const t = setTimeout(() => api.symbols(q).then(setResults).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="rounded-sm border border-line bg-surface p-2">
      <input dir="ltr" className={`${inputCls} mb-2 py-1.5 text-callout`} placeholder="search SF Symbols (brain, phone, sleep…)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto">
        {results.map((name) => (
          <button
            key={name}
            type="button"
            title={name}
            onClick={() => onChange(name)}
            className={`grid aspect-square place-items-center rounded-sm transition ${value === name ? 'bg-tint/40 text-white' : 'text-ink/80 hover:bg-fill'}`}
          >
            <Sym name={name} size={20} />
          </button>
        ))}
        {results.length === 0 && <div className="col-span-8 py-3 text-center text-callout text-muted">לא נמצא</div>}
      </div>
    </div>
  );
}
