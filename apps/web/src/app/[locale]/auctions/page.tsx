import { setRequestLocale } from 'next-intl/server';
import { serverApi } from '@/lib/api-server';
import type { CampaignDTO } from '@auction/shared';
import { AuctionsList } from '@/components/AuctionsList';

export default async function AuctionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const campaign = await serverApi<CampaignDTO | null>('/campaigns/current');
  return <AuctionsList initialCampaign={campaign} />;
}
