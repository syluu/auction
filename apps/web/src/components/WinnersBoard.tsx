'use client';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type { ResultDTO, Currency } from '@auction/shared';
import { useFmt } from '@/lib/format';

export function WinnersBoard({ results, currency, limit = 10 }: { results: ResultDTO[]; currency: Currency; limit?: number }) {
  const t = useTranslations('common');
  const fmt = useFmt();
  return (
    <section className="panel p-4" aria-labelledby="winners-h">
      <div className="flex items-baseline justify-between">
        <h2 id="winners-h" className="font-extrabold">{t('winners')} <span className="text-sm font-semibold text-muted">· {t('winnersSub')}</span></h2>
      </div>
      {results.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('noWinners')}</p>
      ) : (
        <ol className="mt-3 divide-y divide-line">
          {results.slice(0, limit).map((r, i) => (
            <li key={r.auctionId} className="flex items-center gap-3 py-2.5">
              <span className={clsx('num w-7 text-center text-sm font-bold', i === 0 ? 'text-gold' : i < 3 ? 'text-lime' : 'text-muted')}>{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{fmt.text(r.productName)}</div>
                <div className="truncate text-xs text-muted">{r.winnerMasked} · {fmt.money(r.finalPrice, currency)}</div>
              </div>
              <span className="num text-sm font-bold text-lime">+{fmt.compact(r.priceGain, currency)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
