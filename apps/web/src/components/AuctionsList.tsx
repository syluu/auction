'use client';
import { useTranslations } from 'next-intl';
import type { AuctionDTO, CampaignDTO } from '@auction/shared';
import { useCampaignLive } from './useCampaignLive';
import { AuctionCard } from './AuctionCard';
import { useFmt } from '@/lib/format';

export function AuctionsList({ initialCampaign }: { initialCampaign: CampaignDTO | null }) {
  const t = useTranslations('common');
  const fmt = useFmt();
  const { campaign } = useCampaignLive(initialCampaign);
  if (!campaign) return <div className="panel p-10 text-center text-muted">{t('noCampaign')}</div>;
  const groups: [string, AuctionDTO[]][] = [
    [t('liveNow'), campaign.auctions.filter((a) => a.status === 'live')],
    [t('upNext'), campaign.auctions.filter((a) => a.status === 'pending')],
    [t('ended'), campaign.auctions.filter((a) => a.status === 'ended' || a.status === 'cancelled')],
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold">{fmt.text(campaign.name)} <span className="text-sm font-semibold text-muted">· {t('lotCount', { count: campaign.auctions.length })}</span></h1>
      {groups.map(([title, items]) => items.length > 0 && (
        <section key={title}>
          <h2 className="mb-2 font-extrabold">{title} <span className="text-sm text-muted">({items.length})</span></h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{items.map((a) => <AuctionCard key={a.id} a={a} />)}</div>
        </section>
      ))}
    </div>
  );
}
