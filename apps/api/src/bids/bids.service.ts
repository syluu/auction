import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { auctionInclude, toAuctionDTO, type AuctionRow } from '../common/dto';
import { BidRejected } from './bid-rejected';
import type { AutoBidDTO } from '@auction/shared';
import { env } from '../config/env';

const D = Prisma.Decimal;
type Tx = Prisma.TransactionClient;

export interface AppliedBid {
  auction: AuctionRow;          // state right after this bid
  bid: { id: number; amount: Prisma.Decimal; createdAt: Date; isAuto: boolean; userId: number };
  previousLeaderId: number | null;
  extended: boolean;
}

@Injectable()
export class BidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rt: RealtimeService,
    private readonly settings: SettingsService,
  ) {}

  // ------------------------------------------------------------------ manual bid
  async placeBid(auctionId: number, user: { id: number; displayName: string }, amountRaw: string, idempotencyKey: string) {
    const idemKey = `idem:${user.id}:${idempotencyKey}`;
    const cached = await this.redis.client.get(idemKey);
    if (cached) return JSON.parse(cached);
    if (!(await this.redis.allow(`bid:${user.id}`, 3, 2000))) throw new BidRejected('RATE_LIMITED');

    const amount = new D(amountRaw);
    const { placed, final } = await this.prisma.$transaction(
      async (tx) => {
        const { a, now } = await this.lock(tx, auctionId);
        const reject = this.rejecter(a);
        if (a.status !== 'live' || now >= a.currentEndAt) throw reject('AUCTION_CLOSED');
        if (a.leadingUserId === user.id) throw reject('ALREADY_LEADING');
        this.checkAmount(a, amount, reject);
        const minAllowed = this.nextMin(a);
        if (amount.lt(minAllowed)) throw reject('BID_TOO_LOW', minAllowed);

        const placed: AppliedBid[] = [await this.applyBid(tx, a, user.id, amount, now, { isAuto: false, allowExtend: true })];
        return { placed, final: placed[0].auction }; // auto bidders reply via the scheduler after AUTO_BID_DELAY_MS
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10000, maxWait: 5000 },
    );

    await this.fanOut(placed, final, user);
    const response = { auction: toAuctionDTO(final), extended: placed[0].extended, bidId: placed[0].bid.id, youLead: final.leadingUserId === user.id };
    await this.redis.client.set(idemKey, JSON.stringify(response), 'EX', 60);
    return response;
  }

  // ------------------------------------------------------------------ auto bid (proxy)
  async setAutoBid(auctionId: number, user: { id: number; displayName: string }, maxRaw: string) {
    if (!(await this.redis.allow(`bid:${user.id}`, 3, 2000))) throw new BidRejected('RATE_LIMITED');
    const maxPrice = new D(maxRaw);

    const { placed, final, autoBid } = await this.prisma.$transaction(
      async (tx) => {
        const settings = await this.settings.get(tx);
        if (!settings.autoBidEnabled) throw new BidRejected('AUTO_BID_DISABLED');
        const { a, now } = await this.lock(tx, auctionId);
        const reject = this.rejecter(a);
        if (a.status === 'ended' || a.status === 'cancelled' || (a.status === 'live' && now >= a.currentEndAt)) throw reject('AUCTION_CLOSED');
        this.checkAmount(a, maxPrice, reject);
        // leader may lower/raise their ceiling down to the current price; others must at least cover the next step
        const floor = a.leadingUserId === user.id && a.currentPrice ? a.currentPrice : this.nextMin(a);
        if (maxPrice.lt(floor)) throw reject('BID_TOO_LOW', floor);

        const autoBid = await tx.autoBid.upsert({
          where: { auctionId_userId: { auctionId, userId: user.id } },
          update: { maxPrice, active: true },
          create: { auctionId, userId: user.id, maxPrice, active: true },
        });
        const placed: AppliedBid[] = [];
        if (a.status === 'live' && a.leadingUserId !== user.id) {
          const next = this.nextMin(a);
          if (maxPrice.gte(next)) placed.push(await this.applyBid(tx, a, user.id, next, now, { isAuto: true, allowExtend: true }));
        }
        const final = placed.length ? placed[0].auction : a;
        return { placed, final, autoBid };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10000, maxWait: 5000 },
    );

    if (placed.length) await this.fanOut(placed, final, user);
    return { autoBid: this.toAutoBidDTO(autoBid), auction: toAuctionDTO(final), youLead: final.leadingUserId === user.id };
  }

  async removeAutoBid(auctionId: number, userId: number) {
    await this.prisma.autoBid.updateMany({ where: { auctionId, userId }, data: { active: false } });
    return { ok: true };
  }

  async myAutoBid(auctionId: number, userId: number): Promise<AutoBidDTO | null> {
    const ab = await this.prisma.autoBid.findUnique({ where: { auctionId_userId: { auctionId, userId } } });
    return ab && ab.active ? this.toAutoBidDTO(ab) : null;
  }

  /** Live auctions where some non-leader auto bid can still cover the next step. Cheap, index-backed. */
  async dueAutoAuctions(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT a.id FROM auctions a
       WHERE a.status = 'live'
         AND EXISTS (SELECT 1 FROM auto_bids ab
                      WHERE ab.auction_id = a.id AND ab.active
                        AND ab.user_id IS DISTINCT FROM a.leading_user_id
                        AND ab.max_price >= COALESCE(a.current_price + a.step_price, a.start_price))`;
    return rows.map((r) => r.id);
  }

  /**
   * One proxy step for one auction, called by the scheduler tick. Places a single bid for the strongest
   * non-leader auto bidder (highest max, then earliest) once AUTO_BID_DELAY_MS has passed since the last bid
   * (or since the start when there are no bids). Auto replies never extend the clock.
   */
  async autoStep(auctionId: number) {
    const placed = await this.prisma.$transaction(async (tx): Promise<AppliedBid | null> => {
      const settings = await this.settings.get(tx);
      if (!settings.autoBidEnabled) return null;
      const { a, now } = await this.lock(tx, auctionId);
      if (a.status !== 'live' || now >= a.currentEndAt) return null;
      const lastBid = a.leadingBidId ? await tx.bid.findUnique({ where: { id: a.leadingBidId } }) : null;
      const ref = lastBid?.createdAt ?? a.startAt;
      if (now.getTime() - ref.getTime() < env.AUTO_BID_DELAY_MS) return null;
      const next = this.nextMin(a);
      const cand = await tx.autoBid.findFirst({
        where: { auctionId, active: true, userId: { not: a.leadingUserId ?? 0 }, maxPrice: { gte: next } },
        orderBy: [{ maxPrice: 'desc' }, { createdAt: 'asc' }],
      });
      if (!cand) return null;
      return this.applyBid(tx, a, cand.userId, next, now, { isAuto: true, allowExtend: false });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 5000 });
    if (placed) await this.fanOut([placed], placed.auction, null);
  }

  // ------------------------------------------------------------------ internals
  private async lock(tx: Tx, auctionId: number) {
    await tx.$executeRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
    const a = await tx.auction.findUnique({ where: { id: auctionId }, include: auctionInclude });
    if (!a) throw new NotFoundException();
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT now() AS now`;
    return { a, now };
  }

  private rejecter(a: AuctionRow) {
    return (code: 'AUCTION_CLOSED' | 'ALREADY_LEADING' | 'BID_TOO_LOW' | 'BID_INVALID_AMOUNT', minAllowed?: Prisma.Decimal) =>
      new BidRejected(code, { minAllowed: minAllowed?.toString(), currentPrice: a.currentPrice?.toString() ?? null, version: a.version });
  }

  private checkAmount(a: AuctionRow, amount: Prisma.Decimal, reject: ReturnType<BidsService['rejecter']>) {
    if (!amount.isFinite() || amount.lte(0)) throw reject('BID_INVALID_AMOUNT');
    if (a.campaign.currency.trim() === 'VND' && !amount.isInteger()) throw reject('BID_INVALID_AMOUNT');
  }

  private nextMin(a: AuctionRow): Prisma.Decimal {
    return a.currentPrice === null ? a.startPrice : a.currentPrice.plus(a.stepPrice);
  }

  /** Writes one bid + auction update. Caller holds the row lock and has validated the amount. */
  private async applyBid(tx: Tx, a: AuctionRow, userId: number, amount: Prisma.Decimal, now: Date, opts: { isAuto: boolean; allowExtend: boolean }): Promise<AppliedBid> {
    const bid = await tx.bid.create({ data: { auctionId: a.id, userId, amount, isAuto: opts.isAuto } });
    const remainingMs = a.currentEndAt.getTime() - now.getTime();
    const canExtend = a.maxExtensions === null || a.extensionCount < a.maxExtensions;
    const extended = opts.allowExtend && canExtend && a.extendByS > 0 && remainingMs <= a.extendWindowS * 1000;
    const newEnd = extended ? new Date(a.currentEndAt.getTime() + a.extendByS * 1000) : a.currentEndAt;
    const updated = await tx.auction.update({
      where: { id: a.id },
      data: {
        currentPrice: amount, leadingBidId: bid.id, leadingUserId: userId,
        bidCount: { increment: 1 }, currentEndAt: newEnd,
        extensionCount: { increment: extended ? 1 : 0 }, version: { increment: 1 },
      },
      include: auctionInclude,
    });
    return { auction: updated, bid, previousLeaderId: a.leadingUserId, extended };
  }

  /**
   * After commit: one AUCTION_BID event per placed bid, and an outbid alert to the previous leader
   * unless they hold an active auto bid that will answer on the next step (avoids one toast per step in a proxy war).
   */
  private async fanOut(placed: AppliedBid[], final: AuctionRow, trigger: { id: number; displayName: string } | null) {
    for (const p of placed) {
      const name = trigger && p.bid.userId === trigger.id ? trigger.displayName : (await this.prisma.user.findUnique({ where: { id: p.bid.userId } }))?.displayName ?? '';
      this.rt.broadcastBid(p, { id: p.bid.userId, masked: name });
    }
    const prev = placed[0].previousLeaderId;
    if (!prev || prev === final.leadingUserId) return;
    const prevAuto = await this.prisma.autoBid.findUnique({ where: { auctionId_userId: { auctionId: final.id, userId: prev } } });
    const settings = await this.settings.get();
    const willReply = settings.autoBidEnabled && prevAuto?.active && final.currentPrice && prevAuto.maxPrice.gte(final.currentPrice.plus(final.stepPrice));
    if (willReply) return;
    const top = await this.prisma.bid.findFirst({ where: { auctionId: final.id, userId: prev }, orderBy: { amount: 'desc' } });
    this.rt.notifyOutbid(prev, final, top?.amount.toString() ?? '0');
  }

  private toAutoBidDTO(ab: { auctionId: number; maxPrice: Prisma.Decimal; active: boolean; updatedAt: Date }): AutoBidDTO {
    return { auctionId: ab.auctionId, maxPrice: ab.maxPrice.toString(), active: ab.active, updatedAt: ab.updatedAt.toISOString() };
  }
}
