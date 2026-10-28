import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { serverApi } from '@/lib/api-server';
import { RealtimeProvider } from '@/components/RealtimeProvider';
import { Header } from '@/components/Header';
import { ToastHost } from '@/components/ToastHost';
import { pickText, type CampaignDTO, type SettingsDTO, type UserDTO } from '@auction/shared';
import '../globals.css';

export const metadata: Metadata = { title: 'ĐẤU GIÁ.LIVE', description: 'Live auction arena', icons: '/icon.svg' };
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [me, campaign, settings] = await Promise.all([
    serverApi<{ user: UserDTO | null; authMode: string }>('/auth/me'),
    serverApi<CampaignDTO | null>('/campaigns/current'),
    serverApi<SettingsDTO>('/settings'),
  ]);
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&family=JetBrains+Mono:wght@500;700&display=swap" />
      </head>
      <body>
        <NextIntlClientProvider>
          <RealtimeProvider initialUser={me?.user ?? null} authMode={me?.authMode ?? 'password'} initialSettings={settings ?? { autoBidEnabled: false }}>
            <Header campaignName={campaign ? pickText(campaign.name, locale as 'vi' | 'en') : undefined} campaignLive={campaign?.status === 'live'} />
            <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">{children}</main>
            <ToastHost />
          </RealtimeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
