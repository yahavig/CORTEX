// Idea thumbnail: white SF Symbol on a pillar-colored iOS squircle.
import { PILLAR_COLORS, PILLAR_SYMBOLS } from '../../shared/constants.ts';
import type { Video } from '../api.ts';
import { Sym } from './Sym.tsx';

// Superellipse-like clip for the iOS continuous-corner look.
const SQUIRCLE =
  "path('M50,0 C88,0 100,12 100,50 C100,88 88,100 50,100 C12,100 0,88 0,50 C0,12 12,0 50,0 Z')";

export function Thumb({ video, size = 56 }: { video: Pick<Video, 'pillar' | 'symbol'>; size?: number }) {
  const [a, b] = PILLAR_COLORS[video.pillar ?? 'none'];
  const symbol = video.symbol || PILLAR_SYMBOLS[video.pillar ?? 'none'];
  return (
    <div
      className="relative grid shrink-0 place-items-center text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        clipPath: SQUIRCLE.replace(/(\d+)/g, (n) => String((Number(n) / 100) * size)),
        boxShadow: `0 0 ${size / 3}px ${a}55`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent to-50%" />
      <Sym name={symbol} size={size * 0.52} className="relative drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
    </div>
  );
}
