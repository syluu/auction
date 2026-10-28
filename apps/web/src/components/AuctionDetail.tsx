'use client';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AuctionSnapshot } from '@auction/shared';
import { useFmt } from '@/lib/format';
import { Img } from './Img';
import { Price } from './Price';
import { Countdown } from './Countdown';
import { BidPanel } from './BidPanel';
import { AutoBidPanel } from './AutoBidPanel';
import { BidHistory } from './BidHistory';
import { ExtensionBurst } from './ExtensionBurst';
import { useAuctionLive } from './useAuctionLive';
import { useRealtime } from './RealtimeProvider';

export function AuctionDetail({ initial, total }: { initial: AuctionSnapshot; total: number }) {
  const t = useTranslations('common');
  const fmt = useFmt();
  const { user } = useRealtime();
  const { auction: a, bids, setAuction } = useAuctionLive(initial);
  const [img, setImg] = useState(0);
  const leading = !!user && a.leadingUserId === user.id;
  const iBid = !!user && bids.some((b) => b.userId === user.id);
  const status = a.status === 'live' ? (leading ? 'lead' : iBid ? 'outbid' : null) : a.status === 'ended' ? (leading ? 'won' : iBid ? 'lost' : null) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-5">
      <div className="order-1 min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
        <div className="panel overflow-hidden">
          <Img src={a.product.images[img]} alt={fmt.text(a.product.name)} className="h-72 w-full sm:h-[420px]" />
        </div>
        {a.product.images.length > 1 && (
          <div className="flex gap-2 overflow-auto">
            {a.product.images.map((src, i) => (
              <button key={src} onClick={() => setImg(i)} className={clsx('h-16 w-20 shrink-0 overflow-hidden rounded-lg border', i === img ? 'border-lime' : 'border-line')}><Img src={src} alt="" className="h-full w-full" /></button>
            ))}
          </div>
        )}
      </div>
      <section className="panel order-4 min-w-0 p-4 lg:col-start-1 lg:row-start-2">
          <div className="label">{t('originalPrice')}</div>
          <div className="num text-lg line-through decoration-muted">{fmt.money(a.product.originalPrice, a.currency)}</div>
          <p className="mt-3 whitespace-pre-line text-sm text-muted">{fmt.text(a.product.description)}</p>
      </section>
      <div className="order-2 min-w-0 lg:col-start-2 lg:row-start-1">
        <section className="panel space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {a.status === 'live' && <span className="chip bg-cta text-white"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse2" />{t('live')} · {t('lot', { n: a.sortOrder, total })}</span>}
            {a.status === 'pending' && <span className="chip border border-line bg-surface text-muted">{t('pending')} · {fmt.dateTime(a.startAt)}</span>}
            {a.status === 'ended' && <span className="chip border border-line bg-surface text-muted">{t('ended')}</span>}
            {a.status === 'cancelled' && <span className="chip border border-line bg-surface text-hot">{t('cancelled')}</span>}
            <ExtensionBurst currentEndAt={a.currentEndAt} extendByS={a.extendByS} live={a.status === 'live'} />
            {status === 'lead' && <span className="chip bg-lead/15 text-lead">{t('youLead')}</span>}
            {status === 'outbid' && <span className="chip bg-hot/15 text-hot">{t('outbid')}</span>}
            {status === 'won' && <span className="chip bg-gold/20 text-gold">{t('won')}</span>}
            {status === 'lost' && <span className="chip bg-surface text-muted border border-line">{t('lost')}</span>}
          </div>
          <h1 className="text-2xl font-extrabold leading-tight">{fmt.text(a.product.name)}</h1>
          <div>
            <div className="label">{a.currentPrice ? t('currentPrice') : t('startPrice')}</div>
            <div className="mt-1 rounded-xl bg-stage px-3 py-2"><Price value={a.currentPrice ?? a.startPrice} currency={a.currency} size="lg" /></div>
          </div>
          {a.status === 'live' && (
            <div className="flex items-center justify-between"><span className="label">{t('endsIn')}</span><Countdown endAt={a.currentEndAt} size="md" /></div>
          )}
          {a.status === 'pending' && (
            <div className="flex items-center justify-between"><span className="label">{t('startsIn')}</span><Countdown endAt={a.startAt} size="md" /></div>
          )}
          <BidPanel auction={a} onPlaced={(upd) => setAuction((cur) => (upd.version > cur.version ? upd : cur))} />
          <AutoBidPanel auction={a} onPlaced={(upd) => setAuction((cur) => (upd.version > cur.version ? upd : cur))} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{t('bids', { count: a.bidCount })}</span>
            {a.leadingBidderMasked && <span>{t('leader')}: {a.leadingBidderMasked}</span>}
            <span>{t('startPrice')}: <span className="num">{fmt.money(a.startPrice, a.currency)}</span></span>
            {a.extensionCount > 0 && <span className="text-ext">+{a.extensionCount}× {a.extendByS}s</span>}
          </div>
        </section>
      </div>
      <div className="order-3 min-w-0 lg:col-start-2 lg:row-start-2">
        <BidHistory bids={bids} currency={a.currency} />
      </div>
    </div>
  );
}
