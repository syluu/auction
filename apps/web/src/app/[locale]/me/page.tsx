'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import type { AuctionDTO } from '@auction/shared';
import { api } from '@/lib/api';
import { useFmt } from '@/lib/format';
import { Link } from '@/i18n/navigation';
import { useRealtime } from '@/components/RealtimeProvider';
import { Img } from '@/components/Img';
import { Countdown } from '@/components/Countdown';

type Row = { auction: AuctionDTO; myMaxBid: string; state: 'leading' | 'outbid' | 'won' | 'lost' | 'cancelled' };

export default function MePage() {
  const t = useTranslations('me');
  const tc = useTranslations('common');
  const fmt = useFmt();
  const { user, toasts } = useRealtime();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => { if (user) api<Row[]>('/me/bids').then(setRows).catch(() => setRows([])); }, [user, toasts.length]);

  if (!user) return <div className="panel p-8 text-center"><Link href="/login" className="btn-cta">{tc('login')}</Link></div>;
  if (!rows) return <div className="text-muted">{tc('loading')}</div>;
  const label: Record<Row['state'], string> = { leading: tc('youLead'), outbid: tc('outbid'), won: tc('won'), lost: tc('lost'), cancelled: tc('cancelled') };
  const color: Record<Row['state'], string> = { leading: 'bg-lead/15 text-lead', outbid: 'bg-hot/15 text-hot', won: 'bg-gold/20 text-gold', lost: 'bg-surface text-muted border border-line', cancelled: 'bg-surface text-muted border border-line' };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{t('title')}</h1>
      {rows.length === 0 ? <p className="text-muted">{t('empty')}</p> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.auction.id}>
              <Link href={`/auctions/${r.auction.id}`} className="panel flex gap-3 p-3 hover:border-muted">
                <Img src={r.auction.product.images[0]} alt="" className="h-20 w-24 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{fmt.text(r.auction.product.name)}</div>
                  <span className={clsx('chip mt-1', color[r.state])}>{label[r.state]}</span>
                  <div className="mt-1 text-xs text-muted">{t('myMax')}: <span className="num text-ink">{fmt.money(r.myMaxBid, r.auction.currency)}</span></div>
                  <div className="text-xs text-muted">{tc('currentPrice')}: <span className="num text-lime">{fmt.money(r.auction.currentPrice, r.auction.currency)}</span>
                    {r.auction.status === 'live' && <> · <Countdown endAt={r.auction.currentEndAt} size="sm" /></>}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
