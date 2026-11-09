import { useEffect, useState } from 'react';
import { GROUP_LABELS, SECTIONS, type SectionGroup, type SectionId } from './sections.ts';
import { Button } from './components/ui.tsx';
import { StoreProvider, useStore } from './store.tsx';
import { computeAlerts } from './lib/time.ts';
import { Sym } from './components/Sym.tsx';
import { VideoDrawer } from './components/VideoDrawer.tsx';
import { Home } from './views/Home.tsx';
import { Board } from './views/Board.tsx';
import { Week } from './views/Week.tsx';
import { ScriptsView } from './views/scripts/ScriptsView.tsx';
import { Tasks } from './views/Tasks.tsx';
import { BusinessView } from './views/business/BusinessView.tsx';
import { AccountsView } from './modules/accounts/AccountsView.tsx';
import { ReceiptsView } from './modules/receipts/ReceiptsView.tsx';
import { AutomationsView } from './modules/automations/AutomationsView.tsx';

function useHash(): [SectionId, (id: SectionId) => void] {
  const read = () => (location.hash.slice(1) || 'home') as SectionId;
  const [id, setId] = useState(read);
  useEffect(() => {
    const on = () => setId(read());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return [id, (next) => (location.hash = next)];
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

// Sidebar visibility is a per-viewer convenience; storage may be unavailable.
function useSidebar(): [boolean, () => void] {
  const [shown, setShown] = useState(() => {
    try { return localStorage.getItem('cortex.sidebar') !== 'hidden'; } catch { return true; }
  });
  const toggle = () =>
    setShown((v) => {
      try { localStorage.setItem('cortex.sidebar', v ? 'hidden' : 'shown'); } catch {}
      return !v;
    });
  return [shown, toggle];
}

function Shell() {
  const [active, go] = useHash();
  const { videos, slots, loaded, error, clearError } = useStore();
  const [sidebar, toggleSidebar] = useSidebar();
  const [scrolled, setScrolled] = useState(false);
  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]!;
  const warnings = computeAlerts(videos, slots).filter((a) => a.level === 'warn').length;

  // Window title names the place, not the app (toolbars.md › Titles).
  useEffect(() => void (document.title = section.title), [section.title]);

  // ⌘1…⌘9 jump between sections, ⌃⌘S shows/hides the sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        const target = SECTIONS[Number(e.key) - 1];
        if (target) (e.preventDefault(), go(target.id));
      } else if (e.metaKey && e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const groups = (Object.keys(GROUP_LABELS) as SectionGroup[]).map((g) => ({ g, items: SECTIONS.filter((s) => s.group === g) }));

  return (
    <div className="flex h-full">
      {sidebar && (
        <nav aria-label="ניווט" className="glass flex w-[248px] shrink-0 flex-col border-e border-line px-3 pb-4 pt-4">
          <div className="mb-5 flex items-center gap-3 px-2">
            <img src="/icon-512.png" alt="" className="size-8" />
            <span className="text-title2 font-semibold">CORTEX</span>
          </div>
          {groups.map(({ g, items }) => (
            <div key={g} className="mb-5">
              <div className="mb-1 px-2 text-subheadline font-semibold text-muted">{GROUP_LABELS[g]}</div>
              {items.map((s) => {
                const on = s.id === active;
                const index = SECTIONS.indexOf(s) + 1;
                return (
                  <button
                    key={s.id}
                    onClick={() => go(s.id)}
                    aria-current={on ? 'page' : undefined}
                    title={index <= 9 ? `${s.title} (⌘${index})` : s.title}
                    className={`flex min-h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-start text-body transition-colors ${on ? 'bg-fill-strong font-semibold text-ink' : 'text-ink/85 hover:bg-fill-hover'}`}
                  >
                    <Sym name={s.icon} size={17} className="text-tint" />
                    <span className="flex-1 truncate">{s.title}</span>
                    {s.id === 'home' && warnings > 0 && (
                      <span aria-label={`${warnings} התראות`} className="grid min-w-[18px] place-items-center rounded-full bg-neon-orange px-1 text-subheadline font-semibold text-bg">{warnings}</span>
                    )}
                    {s.phase > 2 && <span className="text-subheadline text-muted">בקרוב</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      )}

      <main className="relative min-w-0 flex-1 overflow-y-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}>
        {/* Toolbar: glass functional layer; content scrolls beneath and fades at the edge. */}
        <header className={`glass sticky top-0 z-30 flex min-h-16 items-center gap-3 px-6 transition-[border-color] ${scrolled ? 'border-b border-line' : 'border-b border-transparent'}`}>
          <Button tone="borderless" icon="sidebar.right" title={sidebar ? 'הסתר סרגל צד (⌃⌘S)' : 'הצג סרגל צד (⌃⌘S)'} onClick={toggleSidebar} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-title2 font-semibold">{section.title}</h1>
            <p className="truncate text-callout text-muted">{section.summary}</p>
          </div>
          <span className={`flex items-center gap-1.5 text-subheadline text-muted`} title={loaded ? 'השרת המקומי מחובר' : error ? 'השרת לא זמין' : 'מתחבר'}>
            <span className={`size-1.5 rounded-full ${error ? 'bg-neon-pink' : loaded ? 'bg-neon-green' : 'bg-muted'}`} />
            {error ? 'לא מחובר' : loaded ? '' : 'מתחבר…'}
          </span>
        </header>

        <div className="px-8 pb-12 pt-6">
          {!loaded ? null : active === 'home' ? <Home /> : active === 'board' ? <Board /> : active === 'week' ? <Week /> : active === 'scripts' ? <ScriptsView /> : active === 'tasks' ? <Tasks /> : active === 'business' ? <BusinessView /> : active === 'receipts' ? <ReceiptsView /> : active === 'accounts' ? <AccountsView /> : active === 'automations' ? <AutomationsView /> : <Soon phase={section.phase} />}
        </div>
      </main>

      <VideoDrawer />

      {error && (
        <div role="alert" className="fixed bottom-5 left-5 z-50 flex max-w-md items-center gap-3 rounded-lg border border-line bg-elevated px-4 py-3 text-body">
          <Sym name="exclamationmark.triangle.fill" size={14} className="text-neon-pink" />
          <span className="flex-1">{error}</span>
          <Button tone="borderless" icon="xmark" title="סגור" onClick={clearError} />
        </div>
      )}
    </div>
  );
}

function Soon({ phase }: { phase: number }) {
  return (
    <div className="flex max-w-xl items-center gap-3 rounded-lg border border-dashed border-line p-5 text-body text-muted">
      <Sym name="clock.fill" size={14} />
      המסך הזה ייבנה בשלב {phase}.
    </div>
  );
}
