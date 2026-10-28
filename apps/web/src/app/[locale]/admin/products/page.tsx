'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ProductDTO } from '@auction/shared';
import { api, API_URL } from '@/lib/api';
import { useFmt } from '@/lib/format';
import { AdminShell } from '@/components/admin/AdminShell';
import { Img } from '@/components/Img';

const empty = { name: { vi: '', en: '' }, description: { vi: '', en: '' }, images: [] as string[], originalPrice: '' };

export default function AdminProducts() {
  const t = useTranslations('admin');
  const fmt = useFmt();
  const [items, setItems] = useState<ProductDTO[]>([]);
  const [form, setForm] = useState<typeof empty & { id?: number }>(empty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => api<ProductDTO[]>('/admin/products').then(setItems).catch(() => undefined);
  useEffect(() => { void load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const body = { ...form, originalPrice: form.originalPrice.replace(/[^\d.]/g, '') };
      if (form.id) await api(`/admin/products/${form.id}`, { method: 'PUT', json: body });
      else await api('/admin/products', { method: 'POST', json: body });
      setForm(empty); await load();
    } catch (err: any) { setMsg(err?.body?.code ?? 'error'); } finally { setBusy(false); }
  };
  const upload = async (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(`${API_URL}/api/admin/products/upload`, { method: 'POST', body: fd, credentials: 'include' });
    if (res.ok) { const { url } = await res.json(); setForm((f) => ({ ...f, images: [...f.images, url] })); }
  };
  const remove = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;
    const r = await api(`/admin/products/${id}`, { method: 'DELETE' });
    if (r?.code) setMsg(r.code); await load();
  };

  return (
    <AdminShell>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <form onSubmit={save} className="panel space-y-2 p-4">
          <h2 className="font-extrabold">{form.id ? `#${form.id}` : t('newProduct')}</h2>
          <input className="input" placeholder={t('nameVi')} required value={form.name.vi} onChange={(e) => setForm({ ...form, name: { ...form.name, vi: e.target.value } })} />
          <input className="input" placeholder={t('nameEn')} value={form.name.en} onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })} />
          <textarea className="input" rows={3} placeholder={t('descVi')} value={form.description.vi} onChange={(e) => setForm({ ...form, description: { ...form.description, vi: e.target.value } })} />
          <textarea className="input" rows={2} placeholder={t('descEn')} value={form.description.en} onChange={(e) => setForm({ ...form, description: { ...form.description, en: e.target.value } })} />
          <input className="input num" placeholder={t('originalPrice')} required inputMode="decimal" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
          <div className="flex flex-wrap items-center gap-2">
            {form.images.map((u) => (
              <span key={u} className="relative"><Img src={u} alt="" className="h-14 w-16 rounded-md" /><button type="button" onClick={() => setForm({ ...form, images: form.images.filter((x) => x !== u) })} className="absolute -right-1 -top-1 rounded-full bg-cta px-1 text-[10px] text-white">×</button></span>
            ))}
            <label className="btn-ghost cursor-pointer">{t('upload')}<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
          </div>
          <input className="input text-xs" placeholder="https://… (paste image URL + Enter)" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { setForm({ ...form, images: [...form.images, v] }); (e.target as HTMLInputElement).value = ''; } } }} />
          {msg && <div className="text-sm text-hot">{msg}</div>}
          <div className="flex gap-2"><button className="btn-lime" disabled={busy}>{t('save')}</button>{form.id && <button type="button" className="btn-ghost" onClick={() => setForm(empty)}>{t('cancel')}</button>}</div>
        </form>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase text-muted"><tr><th className="p-3">ID</th><th className="p-3">{t('product')}</th><th className="p-3">{t('originalPrice')}</th><th className="p-3"></th></tr></thead>
            <tbody className="divide-y divide-line">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 num text-muted">{p.id}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><Img src={p.images[0]} alt="" className="h-10 w-14 rounded-md" /><div><div className="font-bold">{p.name.vi}</div><div className="text-xs text-muted">{p.name.en}</div></div></div></td>
                  <td className="p-3 num">{fmt.money(p.originalPrice, 'VND')}</td>
                  <td className="p-3 text-right whitespace-nowrap"><button className="btn-ghost mr-1" onClick={() => setForm({ id: p.id, name: { vi: p.name.vi, en: p.name.en ?? '' }, description: { vi: p.description.vi ?? '', en: p.description.en ?? '' }, images: p.images, originalPrice: p.originalPrice })}>✎</button><button className="btn-ghost text-hot" onClick={() => remove(p.id)}>{t('delete')}</button></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted">{t('noProducts')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
