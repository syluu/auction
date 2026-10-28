'use client';
import { useTranslations } from 'next-intl';
import type { Currency } from '@auction/shared';
import { useFmt } from '@/lib/format';
import type { TickerItem } from './useCampaignLive';

export function Ticker({ feed, currency }: { feed: TickerItem[]; currency: Currency }) {
  const t = useTranslations('common');
  const fmt = useFmt();
  if (!feed.length) return null;
  return (
    <div className="panel flex min-w-0 items-center gap-3 overflow-hidden px-3 py-2 text-xs" aria-live="polite">
      <span className="chip bg-cta text-white shrink-0">{t('live')}</span>
      <div className="flex min-w-0 flex-1 gap-6 overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,black_85%,transparent)]">
        {feed.slice(0, 8).map((f) => (
          <span key={f.id} className="shrink-0 animate-slidein">
            <b>{f.bidder}</b> · <span className="num text-lime">{fmt.money(f.amount, currency)}</span> · <span className="text-muted">{fmt.text(f.name)}</span>
            {f.extended && <span className="ml-1 text-ext">+30s</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
