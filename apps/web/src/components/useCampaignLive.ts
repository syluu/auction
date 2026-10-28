'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EV, type AuctionStatusEvent, type CampaignDTO, type CampaignTickEvent } from '@auction/shared';
import { getSocket } from '@/lib/socket';
import { syncServerTime } from '@/lib/clock';
import { api } from '@/lib/api';

export interface TickerItem { id: number; auctionId: number; amount: string; bidder: string; name: any; extended: boolean }

/** Keeps a campaign DTO fresh from campaign-room events. Also exposes a feed of recent bids for the ticker. */
export function useCampaignLive(initial: CampaignDTO | null) {
  const [campaign, setCampaign] = useState(initial);
  const [feed, setFeed] = useState<TickerItem[]>([]);
  const [statusBump, setStatusBump] = useState(0);
  const seq = useRef(1);
  const campaignRef = useRef(initial);
  useEffect(() => { campaignRef.current = campaign; }, [campaign]);

  const refetch = useCallback(async () => {
    try { setCampaign(await api<CampaignDTO | null>('/campaigns/current')); } catch {}
  }, []);

  useEffect(() => { setCampaign(initial); }, [initial]);

  useEffect(() => {
    if (!campaign) return;
    const s = getSocket();
    const id = campaign.id;
    const join = () => s.emit(EV.JOIN_CAMPAIGN, { campaignId: id });
    const onTick = (e: CampaignTickEvent) => {
      syncServerTime(e.serverTime);
      // Side effects (ticker feed) stay outside the state updater: React StrictMode double-invokes updaters in dev.
      const c = campaignRef.current;
      const cur = c?.auctions.find((a) => a.id === e.auctionId);
      if (!c || !cur || cur.version >= e.version) return;
      if (e.lastBidderMasked && e.currentPrice) {
        setFeed((f) => [{ id: seq.current++, auctionId: cur.id, amount: e.currentPrice!, bidder: e.lastBidderMasked!, name: cur.product.name, extended: !!e.extended }, ...f].slice(0, 12));
      }
      setCampaign((prev) => {
        if (!prev) return prev;
        const idx = prev.auctions.findIndex((a) => a.id === e.auctionId);
        if (idx < 0 || prev.auctions[idx].version >= e.version) return prev;
        const a = { ...prev.auctions[idx], currentPrice: e.currentPrice, currentEndAt: e.currentEndAt, status: e.status, bidCount: e.bidCount, version: e.version, leadingBidderMasked: e.lastBidderMasked ?? prev.auctions[idx].leadingBidderMasked, leadingUserId: e.leadingUserId !== undefined ? e.leadingUserId : prev.auctions[idx].leadingUserId };
        const auctions = prev.auctions.slice(); auctions[idx] = a;
        return { ...prev, auctions };
      });
    };
    const onStatus = (e: AuctionStatusEvent) => {
      syncServerTime(e.serverTime);
      setCampaign((c) => {
        if (!c || !e.auction) return c;
        const idx = c.auctions.findIndex((a) => a.id === e.auctionId);
        if (idx < 0) return c;
        const auctions = c.auctions.slice(); auctions[idx] = e.auction;
        return { ...c, auctions };
      });
      setStatusBump((n) => n + 1);
    };
    s.on('connect', join); if (s.connected) join();
    s.on(EV.CAMPAIGN_TICK, onTick); s.on(EV.AUCTION_STARTED, onStatus); s.on(EV.AUCTION_ENDED, onStatus);
    return () => { s.emit(EV.LEAVE_CAMPAIGN, { campaignId: id }); s.off('connect', join); s.off(EV.CAMPAIGN_TICK, onTick); s.off(EV.AUCTION_STARTED, onStatus); s.off(EV.AUCTION_ENDED, onStatus); };
  }, [campaign?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // after a start/end, resync campaign status (and let callers reload results)
  useEffect(() => { if (statusBump > 0) void refetch(); }, [statusBump, refetch]);

  return { campaign, feed, statusBump, refetch };
}
