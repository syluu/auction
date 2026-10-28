'use client';
import { useEffect, useRef, useState } from 'react';
import { EV, type AuctionBidEvent, type AuctionSnapshot, type AuctionStatusEvent, type BidDTO } from '@auction/shared';
import { getSocket } from '@/lib/socket';
import { syncServerTime } from '@/lib/clock';

/** Keeps one auction + its bid list in sync from the auction room. Versions guard against stale/out-of-order events. */
export function useAuctionLive(initial: AuctionSnapshot) {
  const [auction, setAuction] = useState(initial.auction);
  const [bids, setBids] = useState<BidDTO[]>(initial.bids);
  const [extendedAt, setExtendedAt] = useState<number>(0);
  const idRef = useRef(initial.auction.id);

  useEffect(() => { syncServerTime(initial.serverTime); setAuction(initial.auction); setBids(initial.bids); idRef.current = initial.auction.id; }, [initial]);

  useEffect(() => {
    const s = getSocket();
    const id = idRef.current;
    const join = () => s.emit(EV.JOIN_AUCTION, { auctionId: id });
    const onState = (snap: AuctionSnapshot) => {
      if (snap.auction.id !== id) return;
      syncServerTime(snap.serverTime);
      setAuction((a) => (snap.auction.version >= a.version ? snap.auction : a));
      setBids(snap.bids);
    };
    const onBid = (e: AuctionBidEvent) => {
      if (e.auctionId !== id) return;
      syncServerTime(e.serverTime);
      setAuction((a) => {
        if (e.version <= a.version) return a;
        if (e.extended) setExtendedAt(Date.now());
        return { ...a, currentPrice: e.amount, currentEndAt: e.currentEndAt, bidCount: e.bidCount, version: e.version, leadingUserId: e.bidderId, leadingBidderMasked: e.bidderMasked, extensionCount: a.extensionCount + (e.extended ? 1 : 0) };
      });
      setBids((bs) => (bs.some((b) => b.amount === e.amount) ? bs : [{ id: -e.version, auctionId: id, amount: e.amount, bidderMasked: e.bidderMasked, userId: e.bidderId, isAuto: e.isAuto, createdAt: e.serverTime }, ...bs].slice(0, 50)));
    };
    const onStatus = (e: AuctionStatusEvent) => {
      if (e.auctionId !== id || !e.auction) return;
      syncServerTime(e.serverTime);
      setAuction((a) => (e.version >= a.version ? e.auction! : a));
    };
    s.on('connect', join); if (s.connected) join();
    s.on(EV.AUCTION_STATE, onState); s.on(EV.AUCTION_BID, onBid); s.on(EV.AUCTION_STARTED, onStatus); s.on(EV.AUCTION_ENDED, onStatus);
    return () => { s.emit(EV.LEAVE_AUCTION, { auctionId: id }); s.off('connect', join); s.off(EV.AUCTION_STATE, onState); s.off(EV.AUCTION_BID, onBid); s.off(EV.AUCTION_STARTED, onStatus); s.off(EV.AUCTION_ENDED, onStatus); };
  }, [initial.auction.id]);

  return { auction, bids, extendedAt, setAuction };
}
