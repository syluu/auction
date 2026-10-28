'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api, ApiError } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { useRealtime } from '@/components/RealtimeProvider';
import type { UserDTO } from '@auction/shared';

export default function LoginPage() {
  const t = useTranslations('login');
  const { setUser, authMode } = useRealtime();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const res = await api<{ user: UserDTO }>('/auth/login', { method: 'POST', json: { username, password: password || undefined } });
      setUser(res.user);
      router.push('/'); router.refresh();
    } catch (e) {
      setErr((e as ApiError).status === 0 ? 'NETWORK' : t('failed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <form onSubmit={submit} className="panel space-y-3 p-5">
        <h1 className="text-xl font-extrabold">{t('title')}</h1>
        {authMode === 'username_only' && <p className="rounded-lg bg-ext/10 px-3 py-2 text-xs text-ext">{t('hintUsernameOnly')}</p>}
        <label className="block text-sm">
          <span className="label">{t('username')}</span>
          <input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" required pattern="[a-zA-Z0-9._-]{2,40}" />
        </label>
        <label className="block text-sm">
          <span className="label">{t('password')}</span>
          <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {err && <div role="alert" className="rounded-lg bg-hot/10 px-3 py-2 text-sm text-hot">{err}</div>}
        <button className="btn-cta w-full" disabled={busy || username.length < 2}>{t('submit')}</button>
      </form>
    </div>
  );
}
