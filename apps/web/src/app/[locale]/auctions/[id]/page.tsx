import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { serverApi } from '@/lib/api-server';
import type { AuctionSnapshot, CampaignDTO } from '@auction/shared';
import { AuctionDetail } from '@/components/AuctionDetail';

export default async function AuctionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const snap = await serverApi<AuctionSnapshot>(`/auctions/${id}`);
  if (!snap) notFound();
  const campaign = await serverApi<CampaignDTO>(`/campaigns/${snap.auction.campaignId}`);
  return <AuctionDetail initial={snap} total={campaign?.auctions.length ?? 0} />;
}
