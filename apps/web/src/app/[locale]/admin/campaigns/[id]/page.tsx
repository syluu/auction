'use client';
import { use, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import type { AuctionDTO, CampaignDTO, ProductDTO } from '@auction/shared';
import { api, API_URL } from '@/lib/api';
import { useFmt } from '@/lib/format';
import { AdminShell } from '@/components/admin/AdminShell';
import { useCampaignLive } from '@/components/useCampaignLive';
import { Countdown } from '@/components/Countdown';
import { Link } from '@/i18n/navigation';

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function AdminCampaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const fmt = useFmt();
  const [initial, setInitial] = useState<CampaignDTO | null>(null);
  const { campaign } = useCampaignLive(initial);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ productId: 0, startPrice: '', stepPrice: '', extendWindowS: 30, extendByS: 30, maxExtensions: '' as string, startAt: toLocalInput(new Date(Date.now() + 5 * 60000)), endAt: toLocalInput(new Date(Date.now() + 20 * 60000)) });

  const load = () => api<CampaignDTO>(`/admin/campaigns/${id}`.replace('/admin', '')).then(setInitial).catch(() => undefined);
  useEffect(() => { void load(); api<ProductDTO[]>('/admin/products').then(setProducts).catch(() => undefined); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const call = async (fn: () => Promise<unknown>) => { setMsg(null); try { await fn(); await load(); } catch (e: any) { setMsg(e?.body?.code ?? 'error'); } };
  const add = (e: React.FormEvent) => { e.preventDefault(); void call(() => api(`/admin/campaigns/${id}/auctions`, { method: 'POST', json: {
    productId: Number(form.productId), startPrice: form.startPrice, stepPrice: form.stepPrice, extendWindowS: Number(form.extendWindowS), extendByS: Number(form.extendByS),
    maxExtensions: form.maxExtensions === '' ? null : Number(form.maxExtensions), startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() } })); };
  const move = (a: AuctionDTO, dir: -1 | 1) => {
    if (!campaign) return;
    const ids = campaign.auctions.map((x) => x.id); const i = ids.indexOf(a.id); const j = i + dir;
    if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]];
    void call(() => api(`/admin/campaigns/${id}/order`, { method: 'PUT', json: { auctionIds: ids } }));
  };

  if (!campaign) return <AdminShell><div className="text-muted">{tc('loading')}</div></AdminShell>;
  const cur = campaign.currency;
  return (
    <AdminShell>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-extrabold">{fmt.text(campaign.name)}</h2>
        <span className="chip border border-line bg-surface text-muted">{campaign.status} · {cur}</span>
        <div className="ml-auto flex gap-2">
          <button className="btn-cta" onClick={() => call(() => api(`/admin/campaigns/${id}/start`, { method: 'POST' }))}>{t('startNow')}</button>
          <a className="btn-ghost" href={`${API_URL}/api/admin/campaigns/${id}/export.csv`}>{t('export')}</a>
        </div>
      </div>
      {msg && <div className="text-sm text-hot">{msg}</div>}
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs uppercase text-muted"><tr><th className="p-2">{t('order')}</th><th className="p-2">{t('product')}</th><th className="p-2">{t('status')}</th><th className="p-2">{tc('currentPrice')}</th><th className="p-2">{t('leader')}</th><th className="p-2">{t('startAt')} → {t('endAt')}</th><th className="p-2"></th></tr></thead>
          <tbody className="divide-y divide-line">
            {campaign.auctions.map((a) => (
              <tr key={a.id} className={clsx(a.status === 'live' && 'bg-lime/5')}>
                <td className="p-2 num"><div className="flex items-center gap-1">{a.sortOrder}<button className="text-muted hover:text-ink" onClick={() => move(a, -1)} title={t('moveUp')}>▲</button><button className="text-muted hover:text-ink" onClick={() => move(a, 1)} title={t('moveDown')}>▼</button></div></td>
                <td className="p-2"><Link href={`/auctions/${a.id}`} className="font-bold hover:text-lime">{fmt.text(a.product.name)}</Link><div className="text-xs text-muted">{tc('startPrice')} {fmt.money(a.startPrice, cur)} · {tc('step')} {fmt.money(a.stepPrice, cur)} · +{a.extendByS}s/{a.extendWindowS}s</div></td>
                <td className="p-2"><span className={clsx('chip', a.status === 'live' ? 'bg-cta text-white' : 'border border-line bg-surface text-muted')}>{a.status}</span>{a.status === 'live' && <div className="mt-1"><Countdown endAt={a.currentEndAt} size="sm" /></div>}</td>
                <td className="p-2 num text-lime">{fmt.money(a.currentPrice, cur)}<div className="text-xs text-muted">{tc('bids', { count: a.bidCount })}</div></td>
                <td className="p-2">{a.leadingBidderMasked ?? '—'}{a.leadingUserId ? <div className="text-xs text-muted">uid {a.leadingUserId}</div> : null}</td>
                <td className="p-2 num text-xs">{fmt.dateTime(a.startAt)}<br />{fmt.dateTime(a.currentEndAt)}{a.extensionCount > 0 && <span className="text-ext"> (+{a.extensionCount})</span>}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  {(a.status === 'live' || a.status === 'pending') && <button className="btn-ghost text-hot" onClick={() => confirm(t('confirmCancel')) && call(() => api(`/admin/auctions/${a.id}/cancel`, { method: 'POST' }))}>{t('cancelAuction')}</button>}
                  {a.status === 'pending' && <button className="btn-ghost ml-1" onClick={() => confirm(t('confirmDelete')) && call(() => api(`/admin/auctions/${a.id}`, { method: 'DELETE' }))}>{t('delete')}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="panel grid gap-2 p-4 sm:grid-cols-4">
        <h3 className="font-extrabold sm:col-span-4">{t('addToCampaign')}</h3>
        <select className="input sm:col-span-2" required value={form.productId} onChange={(e) => setForm({ ...form, productId: Number(e.target.value) })}>
          <option value={0}>{t('product')}…</option>{products.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.name.vi}</option>)}
        </select>
        <input className="input num" placeholder={tc('startPrice')} required value={form.startPrice} onChange={(e) => setForm({ ...form, startPrice: e.target.value })} />
        <input className="input num" placeholder={tc('step')} required value={form.stepPrice} onChange={(e) => setForm({ ...form, stepPrice: e.target.value })} />
        <label className="text-xs"><span className="label">{t('startAt')}</span><input type="datetime-local" className="input mt-1" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></label>
        <label className="text-xs"><span className="label">{t('endAt')}</span><input type="datetime-local" className="input mt-1" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></label>
        <label className="text-xs"><span className="label">{t('extendWindow')}</span><input type="number" className="input mt-1 num" value={form.extendWindowS} onChange={(e) => setForm({ ...form, extendWindowS: Number(e.target.value) })} /></label>
        <label className="text-xs"><span className="label">{t('extendBy')}</span><input type="number" className="input mt-1 num" value={form.extendByS} onChange={(e) => setForm({ ...form, extendByS: Number(e.target.value) })} /></label>
        <label className="text-xs sm:col-span-2"><span className="label">{t('maxExt')}</span><input type="number" className="input mt-1 num" value={form.maxExtensions} onChange={(e) => setForm({ ...form, maxExtensions: e.target.value })} /></label>
        <div className="sm:col-span-2 flex items-end"><button className="btn-lime">{t('addToCampaign')}</button></div>
      </form>
    </AdminShell>
  );
}
