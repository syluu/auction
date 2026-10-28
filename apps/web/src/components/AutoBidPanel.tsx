'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { parseMoneyInput, type AuctionDTO, type AutoBidDTO } from '@auction/shared';
import { api, ApiError } from '@/lib/api';
import { useFmt } from '@/lib/format';
import { useRealtime } from './RealtimeProvider';

/** Proxy bidding: user sets a ceiling; the server bids step by step up to it. Hidden when the admin switch is off. */
export function AutoBidPanel({ auction: a, onPlaced }: { auction: AuctionDTO; onPlaced?: (a: AuctionDTO) => void }) {
  const t = useTranslations('bid');
  const fmt = useFmt();
  const { user, settings, pushToast } = useRealtime();
  const [mine, setMine] = useState<AutoBidDTO | null>(null);
  const [open, setOpen] = useState(false);
  const [max, setMax] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !settings.autoBidEnabled) return;
    api<AutoBidDTO | null>(`/auctions/${a.id}/auto-bid`).then((m) => { setMine(m); if (m) setMax(m.maxPrice); }).catch(() => undefined);
  }, [a.id, user, settings.autoBidEnabled]);

  if (!user || !settings.autoBidEnabled || a.status === 'ended' || a.status === 'cancelled') return null;
  const parsed = parseMoneyInput(max, a.currency);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!parsed || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await api<{ autoBid: AutoBidDTO; auction: AuctionDTO }>(`/auctions/${a.id}/auto-bid`, { method: 'PUT', json: { maxPrice: parsed } });
      setMine(res.autoBid); setOpen(false);
      pushToast({ kind: 'info', title: t('auto.placed', { max: fmt.money(res.autoBid.maxPrice, a.currency) }) });
      onPlaced?.(res.auction);
    } catch (err) {
      const b = (err as ApiError).body;
      const code = b?.code ?? 'NETWORK';
      setError(t(`errors.${['BID_TOO_LOW','AUCTION_CLOSED','BID_INVALID_AMOUNT','RATE_LIMITED','AUTO_BID_DISABLED','NETWORK'].includes(code) ? code : 'NETWORK'}` as any, { current: fmt.money(b?.currentPrice ?? null, a.currency), min: fmt.money(b?.minAllowed ?? null, a.currency) }));
      if (b?.minAllowed) setMax(b.minAllowed);
    } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api(`/auctions/${a.id}/auto-bid`, { method: 'DELETE' }); setMine(null); setMax(''); } finally { setBusy(false); }
  };

  return (
    <div className={clsx('rounded-xl border p-3', mine ? 'border-ext/50 bg-ext/5' : 'border-line')}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold">
          <span className="text-ext">⚡ {t('auto.title')}</span>
          {mine && <span className="ml-2 chip bg-ext/15 text-ext">{t('auto.active', { max: fmt.money(mine.maxPrice, a.currency) })}</span>}
        </div>
        {!open && <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>{mine ? t('auto.update') : t('auto.enable')}</button>}
      </div>
      {open && (
        <form onSubmit={save} className="mt-2 space-y-2">
          <p className="text-xs text-muted">{t('auto.hint')}</p>
          <input className="input num" inputMode="decimal" value={max} placeholder={t('auto.placeholder')} onChange={(e) => setMax(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button className="btn-lime flex-1" disabled={busy || !parsed}>{mine ? t('auto.update') : t('auto.enable')} {parsed ? `· ${fmt.money(parsed, a.currency)}` : ''}</button>
            {mine && <button type="button" className="btn-ghost text-hot" onClick={remove} disabled={busy}>{t('auto.disable')}</button>}
            <button type="button" className="btn-ghost" onClick={() => { setOpen(false); setError(null); }}>×</button>
          </div>
          {error && <div role="alert" className="rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{error}</div>}
        </form>
      )}
      {!open && mine && <button type="button" className="mt-1 text-xs text-muted hover:text-hot" onClick={remove} disabled={busy}>{t('auto.disable')}</button>}
    </div>
  );
}
