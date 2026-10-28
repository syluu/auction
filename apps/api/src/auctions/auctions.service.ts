import { Injectable, NotFoundException } from '@nestjs/common';
import { AuctionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { auctionInclude, toAuctionDTO, toBidDTO } from '../common/dto';
import { loadSnapshot } from '../common/snapshot';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService, private readonly rt: RealtimeService) {}

  async list(status?: AuctionStatus, campaignId?: number) {
    const rows = await this.prisma.auction.findMany({
      where: { ...(status ? { status } : {}), ...(campaignId ? { campaignId } : {}) },
      include: auctionInclude,
      orderBy: [{ campaignId: 'desc' }, { sortOrder: 'asc' }],
    });
    return rows.map(toAuctionDTO);
  }

  async get(id: number) {
    const snap = await loadSnapshot(this.prisma, id, 20);
    if (!snap) throw new NotFoundException();
    return snap;
  }

  async bids(id: number, limit = 50) {
    const rows = await this.prisma.bid.findMany({ where: { auctionId: id }, orderBy: { amount: 'desc' }, take: Math.min(limit, 200), include: { user: true } });
    return rows.map(toBidDTO);
  }

  /** Everything the user has bid on, with their status per auction. */
  async myBids(userId: number) {
    const grouped = await this.prisma.bid.groupBy({ by: ['auctionId'], where: { userId }, _max: { amount: true } });
    if (!grouped.length) return [];
    const ids = grouped.map((g) => g.auctionId);
    const auctions = await this.prisma.auction.findMany({ where: { id: { in: ids } }, include: { ...auctionInclude, result: true }, orderBy: { currentEndAt: 'desc' } });
    return auctions.map((a) => {
      const my = grouped.find((g) => g.auctionId === a.id)!._max.amount!.toString();
      let state: 'leading' | 'outbid' | 'won' | 'lost' | 'cancelled';
      if (a.status === 'cancelled') state = 'cancelled';
      else if (a.status === 'ended') state = a.result?.winnerId === userId ? 'won' : 'lost';
      else state = a.leadingUserId === userId ? 'leading' : 'outbid';
      return { auction: toAuctionDTO(a), myMaxBid: my, state };
    });
  }

  /** Admin cancel: takes the same row lock as bids so it cannot race one. */
  async cancel(id: number) {
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM auctions WHERE id = ${id} FOR UPDATE`;
      const a = await tx.auction.findUnique({ where: { id } });
      if (!a) throw new NotFoundException();
      if (a.status === 'ended' || a.status === 'cancelled') return null;
      return tx.auction.update({ where: { id }, data: { status: 'cancelled', version: { increment: 1 } }, include: auctionInclude });
    });
    if (row) this.rt.broadcastStatus(row, { cancelled: true });
    return { ok: true };
  }
}
