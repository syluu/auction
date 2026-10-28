import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { EV, type AuctionBidEvent, type AuctionStatusEvent, type CampaignTickEvent, type UserOutbidEvent, type UserWonEvent } from '@auction/shared';
import { toAuctionDTO, type AuctionRow } from '../common/dto';
import type { AppliedBid } from '../bids/bids.service';
import { PrismaService } from '../prisma/prisma.service';
import { loadSnapshot } from '../common/snapshot';

/** All server->client pushes go through here so modules never touch socket.io directly. */
@Injectable()
export class RealtimeService {
  private server?: Server;
  private readonly log = new Logger('Realtime');
  constructor(private readonly prisma: PrismaService) {}

  attach(server: Server) { this.server = server; }

  private tick(a: AuctionRow, serverTime: string, extra: { lastBidderMasked?: string | null; extended?: boolean } = {}): CampaignTickEvent {
    return { auctionId: a.id, campaignId: a.campaignId, currentPrice: a.currentPrice?.toString() ?? null, currentEndAt: a.currentEndAt.toISOString(), status: a.status, bidCount: a.bidCount, version: a.version, serverTime, leadingUserId: a.leadingUserId, lastBidderMasked: a.leader?.displayName ?? null, ...extra };
  }

  broadcastBid(r: AppliedBid, bidder: { id: number; masked: string }) {
    if (!this.server) return;
    const serverTime = new Date().toISOString();
    const a = r.auction;
    const ev: AuctionBidEvent = {
      auctionId: a.id, amount: r.bid.amount.toString(), bidderMasked: bidder.masked, bidderId: bidder.id, isAuto: r.bid.isAuto,
      bidCount: a.bidCount, currentEndAt: a.currentEndAt.toISOString(), extended: r.extended, version: a.version, serverTime,
    };
    this.server.to(`auction:${a.id}`).emit(EV.AUCTION_BID, ev);
    this.server.to(`campaign:${a.campaignId}`).emit(EV.CAMPAIGN_TICK, this.tick(a, serverTime, { lastBidderMasked: bidder.masked, extended: r.extended }));
  }

  /** Full resync of an auction room after a cascade of auto bids (cheaper than N bid events). */
  async broadcastSnapshot(auctionId: number, a: AuctionRow) {
    if (!this.server) return;
    const snap = await loadSnapshot(this.prisma, auctionId);
    if (snap) this.server.to(`auction:${auctionId}`).emit(EV.AUCTION_STATE, snap);
    this.server.to(`campaign:${a.campaignId}`).emit(EV.CAMPAIGN_TICK, this.tick(a, new Date().toISOString(), { lastBidderMasked: a.leader?.displayName ?? null, extended: false }));
  }

  notifyOutbid(userId: number, a: AuctionRow, yourBid: string) {
    if (!this.server) return;
    const ev: UserOutbidEvent = {
      auctionId: a.id, productName: a.product.name as any, yourBid,
      newPrice: a.currentPrice?.toString() ?? '0', currentEndAt: a.currentEndAt.toISOString(), currency: a.campaign.currency.trim(),
    };
    this.server.to(`user:${userId}`).emit(EV.USER_OUTBID, ev);
  }

  notifyWon(userId: number, a: AuctionRow) {
    if (!this.server) return;
    const ev: UserWonEvent = { auctionId: a.id, productName: a.product.name as any, finalPrice: a.currentPrice?.toString() ?? '0', currency: a.campaign.currency.trim() };
    this.server.to(`user:${userId}`).emit(EV.USER_WON, ev);
  }

  /** started / ended / cancelled */
  broadcastStatus(a: AuctionRow, extra: { cancelled?: boolean } = {}) {
    if (!this.server) return;
    const serverTime = new Date().toISOString();
    const ev: AuctionStatusEvent = {
      auctionId: a.id, campaignId: a.campaignId, status: a.status, version: a.version, serverTime,
      winnerMasked: a.leader ? a.leader.displayName : null, finalPrice: a.currentPrice?.toString() ?? null,
      cancelled: extra.cancelled ?? false, auction: toAuctionDTO(a),
    };
    const name = a.status === 'live' ? EV.AUCTION_STARTED : EV.AUCTION_ENDED;
    this.server.to(`auction:${a.id}`).emit(name, ev);
    this.server.to(`campaign:${a.campaignId}`).emit(name, ev);
    this.server.to(`campaign:${a.campaignId}`).emit(EV.CAMPAIGN_TICK, this.tick(a, serverTime));
  }
}
