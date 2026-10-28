'use client';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useRealtime } from './RealtimeProvider';
import { enableAlerts, disableAlerts } from '@/lib/alerts';
import { api } from '@/lib/api';

export function Header({ campaignName, campaignLive }: { campaignName?: string; campaignLive?: boolean }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, connected, alertsOn, setAlertsOn, logout } = useRealtime();

  const switchLocale = async (l: 'vi' | 'en') => {
    if (user) { try { await api('/auth/me', { method: 'PATCH', json: { locale: l } }); } catch {} }
    router.replace(pathname, { locale: l });
  };
  const toggleAlerts = async () => {
    if (alertsOn) { disableAlerts(); setAlertsOn(false); } else { setAlertsOn(await enableAlerts()); }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-stage/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-1 whitespace-nowrap font-extrabold tracking-tight">
          <span className="text-ink">ĐẤU GIÁ</span><span className="text-lime">.LIVE</span>
        </Link>
        {campaignName && (
          <span className={clsx('chip hidden sm:inline-flex', campaignLive ? 'bg-cta text-white' : 'bg-surface text-muted border border-line')}>
            {campaignLive && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse2" />}{campaignName}
          </span>
        )}
        <nav className="ml-auto flex items-center gap-1 whitespace-nowrap text-sm sm:gap-2">
          <Link href="/auctions" className="hidden rounded-lg px-2 py-1 text-muted hover:text-ink sm:block">{t('auctions')}</Link>
          {user && <Link href="/me" className="rounded-lg px-2 py-1 text-muted hover:text-ink">{t('myBids')}</Link>}
          {user?.role === 'admin' && <Link href="/admin" className="rounded-lg px-2 py-1 text-gold hover:text-ink">{t('admin')}</Link>}
          <div className="flex overflow-hidden rounded-lg border border-line text-xs font-bold">
            {(['vi', 'en'] as const).map((l) => (
              <button key={l} onClick={() => switchLocale(l)} className={clsx('px-2 py-1 uppercase', locale === l ? 'bg-ink text-stage' : 'text-muted hover:text-ink')}>{l}</button>
            ))}
          </div>
          <button onClick={toggleAlerts} title={t(alertsOn ? 'alertsOn' : 'enableAlerts')} aria-pressed={alertsOn}
            className={clsx('rounded-lg border px-2 py-1 text-xs font-bold', alertsOn ? 'border-lime/60 text-lime' : 'border-line text-muted hover:text-ink')}>
            {alertsOn ? '🔔' : '🔕'}<span className="ml-1 hidden md:inline">{t(alertsOn ? 'alertsOn' : 'enableAlerts')}</span>
          </button>
          <span title={connected ? 'online' : t('reconnecting')} className={clsx('h-2 w-2 rounded-full', connected ? 'bg-lead' : 'bg-hot animate-pulse2')} />
          {user ? (
            <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1 text-xs">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-surface font-bold text-ink">{user.displayName.slice(0, 2).toUpperCase()}</span>
              <span className="hidden sm:inline text-muted">{t('logout')}</span>
            </button>
          ) : (
            <Link href="/login" className="btn-lime">{t('login')}</Link>
          )}
        </nav>
      </div>
      {!connected && <div className="bg-hot/15 py-1 text-center text-xs font-bold text-hot">{t('reconnecting')}</div>}
    </header>
  );
}
