'use client';
import clsx from 'clsx';
import { fmtCountdown, msLeft, useServerNow } from '@/lib/clock';

/** Server-synced countdown. Colour states: normal -> amber (<2 min) -> red pulsing (<30 s). */
export function Countdown({ endAt, size = 'md', className }: { endAt: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const now = useServerNow(250);
  const ms = msLeft(endAt, now);
  const danger = ms <= 30_000, warn = ms <= 120_000;
  return (
    <span className={clsx('num font-bold', size === 'lg' && 'text-price', size === 'md' && 'text-price-sm', size === 'sm' && 'text-base',
      danger ? 'text-hot animate-pulse2' : warn ? 'text-gold' : 'text-ink', className)} aria-label="countdown" suppressHydrationWarning>
      {fmtCountdown(ms)}
    </span>
  );
}
