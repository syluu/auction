'use client';
import { useEffect, useState } from 'react';

/** Server-authoritative clock: offset = serverTime - Date.now(), smoothed. */
let offsetMs = 0;
let samples = 0;

export function syncServerTime(iso: string | undefined) {
  if (!iso) return;
  const sample = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(sample)) return;
  offsetMs = samples === 0 ? sample : offsetMs * 0.7 + sample * 0.3;
  samples++;
}

export const serverNow = () => Date.now() + offsetMs;

/** Re-render every `intervalMs` with the current server time (ms). */
export function useServerNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function msLeft(endIso: string, now = serverNow()) { return new Date(endIso).getTime() - now; }

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
