'use client';
import clsx from 'clsx';
import { useRealtime } from './RealtimeProvider';

export function ToastHost() {
  const { toasts, dismissToast } = useRealtime();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={clsx('pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl animate-slidein',
          t.kind === 'outbid' && 'border-hot/60 bg-[#2a0f17] text-ink',
          t.kind === 'won' && 'border-gold/60 bg-[#2a2210] text-ink',
          t.kind === 'info' && 'border-lime/50 bg-[#16220c] text-ink',
          t.kind === 'error' && 'border-line bg-surface text-ink')}>
          <div className="min-w-0 flex-1">
            <div className="font-bold leading-tight">{t.title}</div>
            {t.body && <div className="mt-0.5 text-sm text-muted">{t.body}</div>}
          </div>
          {t.actionLabel && t.onAction && (
            <button className="btn-lime shrink-0" onClick={() => { t.onAction?.(); dismissToast(t.id); }}>{t.actionLabel}</button>
          )}
          <button aria-label="close" className="shrink-0 text-muted hover:text-ink" onClick={() => dismissToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
