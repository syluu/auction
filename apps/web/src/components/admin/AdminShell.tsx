'use client';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import clsx from 'clsx';
import { useRealtime } from '../RealtimeProvider';
import { api } from '@/lib/api';
import type { SettingsDTO } from '@auction/shared';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin');
  const { user, settings, setSettings } = useRealtime();
  const path = usePathname();
  const toggleAutoBid = async () => {
    try { setSettings(await api<SettingsDTO>('/admin/settings', { method: 'PUT', json: { autoBidEnabled: !settings.autoBidEnabled } })); } catch {}
  };
  if (!user || user.role !== 'admin') return <div className="panel p-8 text-center text-muted">403 · {t('title')}</div>;
  const tabs = [['/admin/campaigns', t('campaigns')], ['/admin/products', t('products')]] as const;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-2 text-xl font-extrabold text-gold">{t('title')}</h1>
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className={clsx('rounded-lg px-3 py-1 text-sm font-bold', path.startsWith(href) ? 'bg-surface text-ink border border-line' : 'text-muted hover:text-ink')}>{label}</Link>
        ))}
        <button onClick={toggleAutoBid} aria-pressed={settings.autoBidEnabled} className={clsx('ml-auto rounded-lg border px-3 py-1 text-xs font-bold', settings.autoBidEnabled ? 'border-lead/60 text-lead' : 'border-line text-muted')}>
          {t('autoBid.label')}: {t(settings.autoBidEnabled ? 'autoBid.on' : 'autoBid.off')}
        </button>
      </div>
      {children}
    </div>
  );
}
