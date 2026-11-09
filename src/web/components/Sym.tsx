// SF Symbol from the yahav-brand export, drawn as a mask so it takes `color`.
import type { CSSProperties } from 'react';

export function symbolUrl(name: string) {
  return `/api/symbols/${name}.png`;
}

export function Sym({ name, size = 18, className = '', style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const mask = `url(${symbolUrl(name)}) center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ width: size, height: size, mask, WebkitMask: mask, ...style }}
    />
  );
}
