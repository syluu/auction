'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { EV, type UserOutbidEvent, type UserWonEvent, type UserDTO, type TimeSyncEvent, type SettingsDTO } from '@auction/shared';
import { getSocket, reconnectSocket } from '@/lib/socket';
import { syncServerTime } from '@/lib/clock';
import { alertsEnabled, playOutbid, playWon, showNotification } from '@/lib/alerts';
import { api } from '@/lib/api';
import { useFmt } from '@/lib/format';
import { useRouter } from '@/i18n/navigation';

export interface Toast { id: number; kind: 'outbid' | 'won' | 'info' | 'error'; title: string; body?: string; actionLabel?: string; onAction?: () => void; }

interface Ctx {
  user: UserDTO | null;
  settings: SettingsDTO;
  setSettings: (s: SettingsDTO) => void;
  authMode: string;
  setUser: (u: UserDTO | null) => void;
  connected: boolean;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  alertsOn: boolean;
  setAlertsOn: (v: boolean) => void;
  logout: () => Promise<void>;
}

const RealtimeCtx = createContext<Ctx | null>(null);
export const useRealtime = () => {
  const c = useContext(RealtimeCtx);
  if (!c) throw new Error('RealtimeProvider missing');
  return c;
};

export function RealtimeProvider({ children, initialUser, authMode, initialSettings }: { children: ReactNode; initialUser: UserDTO | null; authMode: string; initialSettings: SettingsDTO }) {
  const [user, setUserState] = useState<UserDTO | null>(initialUser);
  const [settings, setSettings] = useState<SettingsDTO>(initialSettings);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [alertsOn, setAlertsOnState] = useState(false);
  const seq = useRef(1);
  const t = useTranslations('notify');
  const fmt = useFmt();
  const router = useRouter();

  useEffect(() => { setAlertsOnState(alertsEnabled()); }, []);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = seq.current++;
    setToasts((ts) => [...ts.slice(-3), { ...toast, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), toast.kind === 'error' ? 6000 : 8000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);

  const setUser = useCallback((u: UserDTO | null) => { setUserState(u); reconnectSocket(); }, []);
  const logout = useCallback(async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); router.push('/'); router.refresh(); }, [router, setUser]);

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onTime = (e: TimeSyncEvent) => syncServerTime(e.serverTime);
    const onOutbid = (e: UserOutbidEvent) => {
      const name = fmt.text(e.productName);
      const price = fmt.money(e.newPrice, e.currency as any);
      playOutbid();
      pushToast({ kind: 'outbid', title: t('outbidTitle', { product: name }), body: t('outbidBody', { price }), actionLabel: t('bidAgain'), onAction: () => router.push(`/auctions/${e.auctionId}`) });
      showNotification(t('outbidTitle', { product: name }), t('outbidBody', { price }), `outbid-${e.auctionId}`, () => router.push(`/auctions/${e.auctionId}`));
    };
    const onWon = (e: UserWonEvent) => {
      const name = fmt.text(e.productName);
      const price = fmt.money(e.finalPrice, e.currency as any);
      playWon();
      pushToast({ kind: 'won', title: t('wonTitle', { product: name }), body: t('wonBody', { price }) });
      showNotification(t('wonTitle', { product: name }), t('wonBody', { price }), `won-${e.auctionId}`);
    };
    s.on('connect', onConnect); s.on('disconnect', onDisconnect);
    s.on(EV.TIME_SYNC, onTime); s.on(EV.USER_OUTBID, onOutbid); s.on(EV.USER_WON, onWon);
    setConnected(s.connected);
    return () => { s.off('connect', onConnect); s.off('disconnect', onDisconnect); s.off(EV.TIME_SYNC, onTime); s.off(EV.USER_OUTBID, onOutbid); s.off(EV.USER_WON, onWon); };
  }, [fmt, pushToast, router, t]);

  const value = useMemo<Ctx>(() => ({ user, settings, setSettings, authMode, setUser, connected, toasts, pushToast, dismissToast, alertsOn, setAlertsOn: setAlertsOnState, logout }), [user, settings, authMode, setUser, connected, toasts, pushToast, dismissToast, alertsOn, logout]);
  return <RealtimeCtx.Provider value={value}>{children}</RealtimeCtx.Provider>;
}
