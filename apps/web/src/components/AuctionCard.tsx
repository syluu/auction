'use client';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type { AuctionDTO } from '@auction/shared';
import { Link } from '@/i18n/navigation';
import { useFmt } from '@/lib/format';
import { Img } from './Img';
import { Price } from './Price';
import { Countdown } from './Countdown';
import { useRealtime } from './RealtimeProvider';

export function AuctionCard({ a, compact }: { a: AuctionDTO; compact?: boolean }) {
  const t = useTranslations('common');
  const fmt = useFmt();
  const { user } = useRealtime();
  const leading = !!user && a.leadingUserId === user.id;
  return (
    <Link href={`/auctions/${a.id}`} className={clsx('panel group block overflow-hidden transition hover:border-muted', a.status === 'live' && 'border-lime/30')}>
      <div className="relative">
        <Img src={a.product.images[0]} alt={fmt.text(a.product.name)} className={clsx('w-full', compact ? 'h-32' : 'h-44', 'transition group-hover:scale-[1.02]')} />
        <div className="absolute left-2 top-2 flex gap-1">
          {a.status === 'live' && <span className="chip bg-cta text-white"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse2" />{t('live')}</span>}
          {a.status === 'pending' && <span className="chip bg-surface/90 text-muted border border-line">{t('pending')}</span>}
          {a.status === 'ended' && <span className="chip bg-surface/90 text-muted border border-line">{t('ended')}</span>}
          {a.status === 'cancelled' && <span className="chip bg-surface/90 text-hot border border-line">{t('cancelled')}</span>}
        </div>
        {leading && a.status === 'live' && <span className="chip absolute right-2 top-2 bg-lead/20 text-lead">{t('youLead')}</span>}
      </div>
      <div className="p-3">
        <div className="truncate font-bold">{fmt.text(a.product.name)}</div>
        <div className="mt-1 flex items-end justify-between gap-2">
          {a.status === 'pending'
            ? <div className="text-sm text-muted">{t('from')} <span className="num text-ink">{fmt.money(a.startPrice, a.currency)}</span></div>
            : <Price value={a.currentPrice ?? a.startPrice} currency={a.currency} size="sm" />}
          {a.status === 'live' && <Countdown endAt={a.currentEndAt} size="sm" />}
          {a.status === 'pending' && <span className="num text-sm text-ext">{fmt.time(a.startAt)}</span>}
        </div>
        <div className="mt-1 text-xs text-muted">{t('bids', { count: a.bidCount })}{a.leadingBidderMasked ? ` · ${a.leadingBidderMasked}` : ''}</div>
      </div>
    </Link>
  );
}
