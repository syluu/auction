'use client';
import { useTranslations } from 'next-intl';
import type { AuctionDTO } from '@auction/shared';
import { Link } from '@/i18n/navigation';
import { useFmt } from '@/lib/format';
import { Img } from './Img';
import { Price } from './Price';
import { Countdown } from './Countdown';
import { BidPanel } from './BidPanel';
import { AutoBidPanel } from './AutoBidPanel';
import { ExtensionBurst } from './ExtensionBurst';
import { useRealtime } from './RealtimeProvider';

/** Featured live lot on the main page (fed by campaign ticks from the parent). */
export function HeroAuction({ initial: a, total }: { auctionId: number; initial: AuctionDTO; total: number }) {
  const t = useTranslations('common');
  const fmt = useFmt();
  const { user } = useRealtime();
  const leading = !!user && a.leadingUserId === user.id;
  return (
    <section className="panel grid gap-4 overflow-hidden border-lime/30 p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Link href={`/auctions/${a.id}`} className="relative block min-w-0">
        <Img src={a.product.images[0]} alt={fmt.text(a.product.name)} className="aspect-[4/3] w-full rounded-xl md:aspect-auto md:h-full md:max-h-[460px] md:min-h-[320px]" />
        <span className="absolute bottom-2 left-2 rounded-md bg-stage/80 px-2 py-0.5 text-xs text-muted">{fmt.text(a.product.name)}</span>
      </Link>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-cta text-white"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse2" />{t('live')} · {t('lot', { n: a.sortOrder, total })}</span>
          <ExtensionBurst currentEndAt={a.currentEndAt} extendByS={a.extendByS} live={a.status === 'live'} />
        </div>
        <Link href={`/auctions/${a.id}`} className="text-2xl font-extrabold leading-tight hover:text-lime">{fmt.text(a.product.name)}</Link>
        <div>
          <div className="label">{t('currentPrice')}</div>
          <div className="mt-1 rounded-xl bg-stage px-3 py-2"><Price value={a.currentPrice ?? a.startPrice} currency={a.currency} size="lg" /></div>
        </div>
        <div className="flex items-center justify-between">
          <span className="label">{t('endsIn')}</span>
          <Countdown endAt={a.currentEndAt} size="md" />
        </div>
        <BidPanel auction={a} compact />
        <AutoBidPanel auction={a} />
        <div className="flex items-center gap-3 text-xs text-muted">
          {leading && <span className="chip bg-lead/15 text-lead">{t('youLead')}</span>}
          <span>{t('bids', { count: a.bidCount })}</span>
          {a.leadingBidderMasked && <span>· {t('leader')}: {a.leadingBidderMasked}</span>}
        </div>
      </div>
    </section>
  );
}
