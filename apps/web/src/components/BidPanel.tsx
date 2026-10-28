'use client';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { minNextBid, parseMoneyInput, type AuctionDTO, type BidRejection } from '@auction/shared';
import { api, ApiError } from '@/lib/api';
import { useFmt } from '@/lib/format';
import { Link } from '@/i18n/navigation';
import { useRealtime } from './RealtimeProvider';
import { playTick } from '@/lib/alerts';

export function BidPanel({ auction: a, onPlaced, compact }: { auction: AuctionDTO; onPlaced?: (a: AuctionDTO) => void; compact?: boolean }) {
  const t = useTranslations('bid');
  const tc = useTranslations('common');
  const fmt = useFmt();
  const { user, pushToast } = useRealtime();
  const min = useMemo(() => minNextBid(a.currentPrice, a.startPrice, a.stepPrice), [a.currentPrice, a.startPrice, a.stepPrice]);
  const [amount, setAmount] = useState<string>(min);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; rej?: BidRejection } | null>(null);

  // follow the minimum unless the user typed something higher
  useEffect(() => { if (!touched || Number(amount) < Number(min)) { setAmount(min); } }, [min]); // eslint-disable-line react-hooks/exhaustive-deps
  // any state change (new bid, lead change, auction start/end) invalidates a previous error message
  useEffect(() => { setError(null); }, [a.version, a.leadingUserId, a.status]);

  const leading = !!user && a.leadingUserId === user.id;
  const live = a.status === 'live';
  const quick = [1, 2, 5].map((k) => ({ k, v: String(Number(min) + Number(a.stepPrice) * (k - 1)) }));
  const parsed = parseMoneyInput(amount, a.currency);

  const submit = async (value?: string) => {
    const v = value ?? parsed;
    if (!v || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await api<{ auction: AuctionDTO; extended: boolean }>(`/auctions/${a.id}/bids`, { method: 'POST', json: { amount: v, idempotencyKey: crypto.randomUUID() } });
      playTick();
      pushToast({ kind: 'info', title: res.extended ? t('placedExtended', { amount: fmt.money(v, a.currency), s: a.extendByS }) : t('placed', { amount: fmt.money(v, a.currency) }) });
      onPlaced?.(res.auction);
      setTouched(false);
    } catch (e) {
      const err = e as ApiError;
      const code = err.body?.code ?? 'NETWORK';
      setError({ code, rej: err.body });
      if (err.body?.minAllowed) { setAmount(err.body.minAllowed); setTouched(false); }
    } finally { setBusy(false); }
  };

  const errorText = error ? t(`errors.${['BID_TOO_LOW','AUCTION_CLOSED','ALREADY_LEADING','BID_INVALID_AMOUNT','RATE_LIMITED','UNAUTHENTICATED','NETWORK','VALIDATION_ERROR'].includes(error.code) ? error.code : 'NETWORK'}` as any, {
    current: fmt.money(error.rej?.currentPrice ?? null, a.currency), min: fmt.money(error.rej?.minAllowed ?? null, a.currency) }) : null;

  if (!user) return <Link href="/login" className="btn-cta w-full">{t('loginToBid')}</Link>;
  if (!live) return <div className="btn-ghost w-full cursor-default">{a.status === 'pending' ? t('notStarted') : t('closed')}</div>;

  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void submit(); }} aria-busy={busy}>
      <div className={clsx('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-3')}>
        {quick.map((q) => (
          <button type="button" key={q.k} onClick={() => { setAmount(q.v); setTouched(true); }}
            className={clsx('btn-ghost num', amount === q.v && 'border-lime text-lime')}>{t('quick', { n: q.k, step: fmt.compact(a.stepPrice, a.currency) })}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input num" inputMode="decimal" value={amount} placeholder={t('placeholder')} aria-label={t('title')}
          onChange={(e) => { setAmount(e.target.value); setTouched(true); }} disabled={leading && !touched} />
      </div>
      <button type="submit" className="btn-cta w-full num" disabled={busy || !parsed || leading}>
        {leading ? tc('youLead') : t('submit', { amount: parsed ? fmt.money(parsed, a.currency) : '…' })}
      </button>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{t('min', { amount: fmt.money(min, a.currency) })}</span>
        <span>{tc('step')}: <span className="num">{fmt.money(a.stepPrice, a.currency)}</span></span>
      </div>
      {errorText && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-hot/50 bg-hot/10 px-3 py-2 text-sm">
          <span>{errorText}</span>
          {error?.rej?.minAllowed && <button type="button" className="btn-lime shrink-0" onClick={() => submit(error.rej!.minAllowed)}>{t('rebid', { amount: fmt.money(error.rej.minAllowed, a.currency) })}</button>}
        </div>
      )}
    </form>
  );
}
