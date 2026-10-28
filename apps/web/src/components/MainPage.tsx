'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CampaignDTO, ResultDTO } from '@auction/shared';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useFmt } from '@/lib/format';
import { useCampaignLive } from './useCampaignLive';
import { AuctionCard } from './AuctionCard';
import { WinnersBoard } from './WinnersBoard';
import { Ticker } from './Ticker';
import { HeroAuction } from './HeroAuction';

export function MainPage({ initialCampaign, initialResults }: { initialCampaign: CampaignDTO | null; initialResults: ResultDTO[] }) {
  const t = useTranslations('common');
  const fmt = useFmt();
  const { campaign, feed, statusBump } = useCampaignLive(initialCampaign);
  const [results, setResults] = useState(initialResults);

  useEffect(() => {
    if (!campaign || statusBump === 0) return;
    api<ResultDTO[]>(`/campaigns/${campaign.id}/results`).then(setResults).catch(() => undefined);
  }, [statusBump, campaign?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { live, upcoming, ended } = useMemo(() => {
    const as = campaign?.auctions ?? [];
    return {
      live: as.filter((a) => a.status === 'live').sort((x, y) => new Date(x.currentEndAt).getTime() - new Date(y.currentEndAt).getTime()),
      upcoming: as.filter((a) => a.status === 'pending').sort((x, y) => x.sortOrder - y.sortOrder),
      ended: as.filter((a) => a.status === 'ended' || a.status === 'cancelled'),
    };
  }, [campaign]);

  if (!campaign) return <div className="panel p-10 text-center text-muted">{t('noCampaign')}</div>;
  const hero = live[0];
  const rest = live.slice(1);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        {hero ? (
          <HeroAuction auctionId={hero.id} initial={hero} total={campaign.auctions.length} />
        ) : (
          <div className="panel p-8 text-center">
            <div className="text-lg font-extrabold">{fmt.text(campaign.name)}</div>
            <div className="mt-1 text-muted">
              {campaign.status === 'finished' ? t('campaignEnded') : upcoming[0] ? t('campaignScheduled', { time: fmt.dateTime(upcoming[0].startAt) }) : t('noItems')}
            </div>
          </div>
        )}
        <Ticker feed={feed} currency={campaign.currency} />
        {rest.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between"><h2 className="font-extrabold">{t('liveNow')}</h2><Link href="/auctions" className="text-xs text-muted hover:text-ink">{t('viewAll')} →</Link></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{rest.map((a) => <AuctionCard key={a.id} a={a} compact />)}</div>
          </section>
        )}
        {upcoming.length > 0 && (
          <section className="lg:hidden">
            <h2 className="mb-2 font-extrabold">{t('upNext')}</h2>
            <div className="grid grid-cols-2 gap-3">{upcoming.slice(0, 4).map((a) => <AuctionCard key={a.id} a={a} compact />)}</div>
          </section>
        )}
        {ended.length > 0 && live.length === 0 && (
          <section>
            <h2 className="mb-2 font-extrabold">{t('ended')}</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{ended.slice(0, 6).map((a) => <AuctionCard key={a.id} a={a} compact />)}</div>
          </section>
        )}
      </div>
      <aside className="min-w-0 space-y-4">
        <section className="panel p-4">
          <h2 className="font-extrabold">{t('upNext')} <span className="text-sm font-semibold text-muted">· {t('lotCount', { count: upcoming.length })}</span></h2>
          {upcoming.length === 0 ? <p className="mt-2 text-sm text-muted">{t('noItems')}</p> : (
            <ul className="mt-2 divide-y divide-line">
              {upcoming.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link href={`/auctions/${a.id}`} className="flex items-center gap-3 py-2 text-sm hover:text-lime">
                    <span className="num font-bold text-ext">{fmt.time(a.startAt)}</span>
                    <span className="min-w-0 flex-1 truncate">{fmt.text(a.product.name)}</span>
                    <span className="num text-xs text-muted">{t('from')} {fmt.compact(a.startPrice, campaign.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <WinnersBoard results={results} currency={campaign.currency} />
      </aside>
    </div>
  );
}
