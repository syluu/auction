import { setRequestLocale } from 'next-intl/server';
import { serverApi } from '@/lib/api-server';
import type { CampaignDTO, ResultDTO } from '@auction/shared';
import { MainPage } from '@/components/MainPage';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const campaign = await serverApi<CampaignDTO | null>('/campaigns/current');
  const results = campaign ? (await serverApi<ResultDTO[]>(`/campaigns/${campaign.id}/results`)) ?? [] : [];
  return <MainPage initialCampaign={campaign} initialResults={results} />;
}
