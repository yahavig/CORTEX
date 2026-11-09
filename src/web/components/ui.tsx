// Shared controls, sized like apple.com (getdesign.md/apple): pill buttons with 14px
// caption text, 44px text fields with 17px body text, pill segmented controls.
// Weights 400/600 only, no chrome shadows, a press state on every button.
import type { ReactNode } from 'react';
import { Sym } from './Sym.tsx';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between text-callout font-semibold text-muted">
        <span>{label}</span>
        {hint}
      </div>
      {children}
    </label>
  );
}

// Text field: opaque field color, hairline border, accent focus ring from :focus-visible.
export const inputCls =
  'w-full min-h-11 rounded-md border border-line bg-field px-4 py-2.5 text-body text-ink outline-none placeholder:text-muted/70 focus:border-accent';

// Segmented control: equal-width pill segments, selection shown by surface change.
export function Segmented<T extends string>({ value, options, onChange }: { value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" className="flex rounded-full bg-fill p-1">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-8 flex-1 whitespace-nowrap rounded-full px-4 text-callout transition-colors ${on ? 'bg-selected font-semibold text-ink' : 'text-ink/80 hover:bg-fill-hover'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

type Tone = 'plain' | 'primary' | 'danger' | 'borderless';

const TONES: Record<Tone, string> = {
  plain: 'bg-fill text-ink hover:bg-fill-strong',
  primary: 'bg-accent text-white hover:brightness-110',
  danger: 'text-neon-pink hover:bg-neon-pink/10',
  borderless: 'text-ink/80 hover:bg-fill-hover hover:text-ink',
};

export function Button({
  children, onClick, tone = 'plain', icon, disabled, type = 'button', title,
}: { children?: ReactNode; onClick?: () => void; tone?: Tone; icon?: string; disabled?: boolean; type?: 'button' | 'submit'; title?: string }) {
  const iconOnly = !children;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={iconOnly ? title : undefined}
      className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-callout font-semibold transition-[background-color,filter,transform] active:scale-95 active:brightness-95 disabled:pointer-events-none disabled:opacity-40 ${iconOnly ? 'w-9' : 'px-4'} ${TONES[tone]}`}
    >
      {icon && <Sym name={icon} size={15} />}
      {children}
    </button>
  );
}

// A grouped surface for content (opaque, never glass).
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-surface p-6 ${className}`}>{children}</section>;
}
