'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CampaignDTO } from '@auction/shared';
import { api } from '@/lib/api';
import { useFmt } from '@/lib/format';
import { Link } from '@/i18n/navigation';
import { AdminShell } from '@/components/admin/AdminShell';

export default function AdminCampaigns() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const fmt = useFmt();
  const [items, setItems] = useState<CampaignDTO[]>([]);
  const [form, setForm] = useState({ vi: '', en: '', currency: 'VND' as 'VND' | 'USD' });
  const load = () => api<CampaignDTO[]>('/admin/campaigns').then(setItems).catch(() => undefined);
  useEffect(() => { void load(); }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/admin/campaigns', { method: 'POST', json: { name: { vi: form.vi, en: form.en || undefined }, currency: form.currency } });
    setForm({ vi: '', en: '', currency: 'VND' }); await load();
  };
  return (
    <AdminShell>
      <form onSubmit={create} className="panel flex flex-wrap items-end gap-2 p-4">
        <label className="text-xs"><span className="label">{t('nameVi')}</span><input className="input mt-1" required value={form.vi} onChange={(e) => setForm({ ...form, vi: e.target.value })} /></label>
        <label className="text-xs"><span className="label">{t('nameEn')}</span><input className="input mt-1" value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label>
        <label className="text-xs"><span className="label">{t('currency')}</span><select className="input mt-1" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as any })}><option>VND</option><option>USD</option></select></label>
        <button className="btn-lime">{t('newCampaign')}</button>
      </form>
      <div className="panel divide-y divide-line">
        {items.map((c) => (
          <Link key={c.id} href={`/admin/campaigns/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-stage/50">
            <span className="num text-muted">#{c.id}</span>
            <span className="flex-1 font-bold">{fmt.text(c.name)}</span>
            <span className="chip border border-line bg-surface text-muted">{c.status}</span>
            <span className="text-xs text-muted">{c.currency} · {tc('lotCount', { count: c.auctions.length })}</span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
