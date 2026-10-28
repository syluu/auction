'use client';
/**
 * Sound + browser notifications. Browsers require a user gesture before audio and
 * before Notification.requestPermission(), so call enableAlerts() from a click handler.
 */
const KEY = 'auction.alerts';
let ctx: AudioContext | null = null;

export function alertsEnabled(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export async function enableAlerts(): Promise<boolean> {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    localStorage.setItem(KEY, '1');
    beep([[880, 0.08], [1320, 0.12]], 0.05);
    return true;
  } catch { return false; }
}

export function disableAlerts() { try { localStorage.removeItem(KEY); } catch {} }

function beep(notes: [number, number][], gain = 0.12) {
  if (!ctx) return;
  let t = ctx.currentTime;
  for (const [freq, dur] of notes) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
    t += dur + 0.03;
  }
}

export function playOutbid() { if (alertsEnabled()) { ensureCtx(); beep([[660, 0.12], [440, 0.18]], 0.14); } }
export function playWon() { if (alertsEnabled()) { ensureCtx(); beep([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.25]], 0.12); } }
export function playTick() { if (alertsEnabled()) { ensureCtx(); beep([[1200, 0.04]], 0.05); } }

function ensureCtx() {
  try { ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)(); if (ctx.state === 'suspended') void ctx.resume(); } catch {}
}

export function showNotification(title: string, body: string, tag: string, onClick?: () => void) {
  if (!alertsEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // in-page toast is enough when the tab is visible
  try {
    const n = new Notification(title, { body, tag, icon: '/icon.svg' });
    n.onclick = () => { window.focus(); onClick?.(); n.close(); };
  } catch {}
}
