'use client';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type { BidDTO, Currency } from '@auction/shared';
import { useFmt } from '@/lib/format';
import { useRealtime } from './RealtimeProvider';

export function BidHistory({ bids, currency }: { bids: BidDTO[]; currency: Currency }) {
  const t = useTranslations('bid');
  const tc = useTranslations('common');
  const fmt = useFmt();
  const { user } = useRealtime();
  return (
    <section className="panel p-4">
      <h3 className="font-extrabold">{t('history')}</h3>
      {bids.length === 0 ? <p className="mt-2 text-sm text-muted">{tc('noBids')}</p> : (
        <ol className="mt-2 max-h-80 divide-y divide-line overflow-auto" aria-live="polite">
          {bids.map((b, i) => (
            <li key={b.id} className={clsx('flex items-center justify-between py-2 text-sm', i === 0 && 'text-lime')}>
              <span className="flex items-center gap-2">
                <span className={clsx('num font-bold', i === 0 ? 'text-lime' : 'text-ink')}>{fmt.money(b.amount, currency)}</span>
                {i === 0 && <span className="chip bg-lime/15 text-lime">{tc('leader')}</span>}
                {b.isAuto && <span className="chip bg-ext/15 text-ext">{t('auto.chip')}</span>}
              </span>
              <span className="text-muted">{user && b.userId === user.id ? <b className="text-ink">{user.displayName}</b> : b.bidderMasked} · <span className="num">{fmt.time(b.createdAt)}</span></span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
