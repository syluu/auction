import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from '../realtime/realtime.service';
import { auctionInclude } from '../common/dto';
import { env } from '../config/env';
import { BidsService } from '../bids/bids.service';

/**
 * 1-second tick that moves auctions pending -> live -> ended and writes results.
 * Safe against bids: the UPDATE waits for any in-flight bid holding the row lock and
 * re-evaluates its WHERE on the fresh row, so an extension made by that bid prevents the close.
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly log = new Logger('Scheduler');

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService, private readonly rt: RealtimeService, private readonly bids: BidsService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), env.SCHEDULER_INTERVAL_MS);
    this.log.log(`tick every ${env.SCHEDULER_INTERVAL_MS} ms`);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      // one scheduler across replicas
      if (!(await this.redis.tryLock('scheduler', Math.floor(env.SCHEDULER_INTERVAL_MS * 0.9)))) return;
      await this.startDue();
      await this.endDue();
      await this.autoBidSteps();
      await this.syncCampaignStatus();
    } catch (e) {
      this.log.error(`tick failed: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async startDue() {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      UPDATE auctions SET status = 'live', version = version + 1
       WHERE status = 'pending' AND start_at <= now()
      RETURNING id`;
    for (const { id } of rows) {
      const a = await this.prisma.auction.findUnique({ where: { id }, include: auctionInclude });
      if (a) { this.rt.broadcastStatus(a); this.log.log(`auction ${id} started`); }
    }
  }

  private async endDue() {
    const endedIds = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        UPDATE auctions SET status = 'ended', version = version + 1
         WHERE status = 'live' AND current_end_at <= now()
        RETURNING id`;
      for (const { id } of rows) {
        const a = await tx.auction.findUnique({ where: { id } });
        if (!a) continue;
        await tx.auctionResult.create({
          data: {
            auctionId: a.id, campaignId: a.campaignId, winnerId: a.leadingUserId,
            startPrice: a.startPrice, finalPrice: a.currentPrice,
            priceGain: a.currentPrice ? a.currentPrice.minus(a.startPrice) : null,
            endedAt: new Date(),
          },
        });
      }
      return rows.map((r) => r.id);
    });
    for (const id of endedIds) {
      const a = await this.prisma.auction.findUnique({ where: { id }, include: auctionInclude });
      if (!a) continue;
      this.rt.broadcastStatus(a);
      if (a.leadingUserId) this.rt.notifyWon(a.leadingUserId, a);
      this.log.log(`auction ${id} ended, winner=${a.leadingUserId ?? 'none'}`);
    }
  }

  /** One delayed proxy step per live auction that has a pending auto bidder. */
  private async autoBidSteps() {
    for (const id of await this.bids.dueAutoAuctions()) {
      await this.bids.autoStep(id).catch((e) => this.log.error(`auto step ${id}: ${(e as Error).message}`));
    }
  }

  /** scheduled -> live when any item is live; live/scheduled -> finished when nothing is pending/live. */
  private async syncCampaignStatus() {
    await this.prisma.$executeRaw`
      UPDATE campaigns c SET status = 'live'
       WHERE c.status = 'scheduled'
         AND EXISTS (SELECT 1 FROM auctions a WHERE a.campaign_id = c.id AND a.status = 'live')`;
    await this.prisma.$executeRaw`
      UPDATE campaigns c SET status = 'finished'
       WHERE c.status IN ('live','scheduled')
         AND EXISTS (SELECT 1 FROM auctions a WHERE a.campaign_id = c.id)
         AND NOT EXISTS (SELECT 1 FROM auctions a WHERE a.campaign_id = c.id AND a.status IN ('pending','live'))`;
  }
}
