import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuctionConfigInput, CampaignInput } from '@auction/shared';
import { PrismaService } from '../prisma/prisma.service';
import { auctionInclude, toAuctionDTO, toCampaignDTO, toResultDTO } from '../common/dto';

const campaignInclude = { auctions: { include: auctionInclude, orderBy: { sortOrder: 'asc' as const } } };

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The campaign the main page shows: live > scheduled (soonest) > most recent finished. */
  async current() {
    const live = await this.prisma.campaign.findFirst({ where: { status: 'live' }, include: campaignInclude, orderBy: { startAt: 'desc' } });
    if (live) return toCampaignDTO(live);
    const sched = await this.prisma.campaign.findFirst({ where: { status: 'scheduled' }, include: campaignInclude, orderBy: { startAt: 'asc' } });
    if (sched) return toCampaignDTO(sched);
    const fin = await this.prisma.campaign.findFirst({ where: { status: 'finished' }, include: campaignInclude, orderBy: { startAt: 'desc' } });
    return fin ? toCampaignDTO(fin) : null;
  }

  async get(id: number) {
    const c = await this.prisma.campaign.findUnique({ where: { id }, include: campaignInclude });
    if (!c) throw new NotFoundException();
    return toCampaignDTO(c);
  }

  async results(campaignId: number, limit = 50) {
    const rows = await this.prisma.auctionResult.findMany({
      where: { campaignId, winnerId: { not: null } },
      orderBy: [{ priceGain: 'desc' }, { endedAt: 'asc' }],
      take: limit,
      include: { winner: true, auction: { include: { product: true } } },
    });
    return rows.map(toResultDTO);
  }

  // ---------- admin ----------
  async list() {
    const rows = await this.prisma.campaign.findMany({ include: campaignInclude, orderBy: { id: 'desc' } });
    return rows.map(toCampaignDTO);
  }

  async create(input: CampaignInput) {
    const c = await this.prisma.campaign.create({
      data: { name: input.name, currency: input.currency, startAt: input.startAt ? new Date(input.startAt) : null, status: input.startAt ? 'scheduled' : 'draft' },
      include: campaignInclude,
    });
    return toCampaignDTO(c);
  }

  async update(id: number, input: CampaignInput) {
    const c = await this.prisma.campaign.update({
      where: { id },
      data: { name: input.name, currency: input.currency, startAt: input.startAt ? new Date(input.startAt) : null },
      include: campaignInclude,
    });
    return toCampaignDTO(c);
  }

  async addAuction(campaignId: number, input: AuctionConfigInput) {
    const startAt = new Date(input.startAt), endAt = new Date(input.endAt);
    if (endAt <= startAt) throw new BadRequestException({ code: 'END_BEFORE_START' });
    const last = await this.prisma.auction.aggregate({ where: { campaignId }, _max: { sortOrder: true } });
    const a = await this.prisma.auction.create({
      data: {
        campaignId, productId: input.productId, sortOrder: (last._max.sortOrder ?? 0) + 1,
        startPrice: input.startPrice, stepPrice: input.stepPrice,
        extendWindowS: input.extendWindowS, extendByS: input.extendByS, maxExtensions: input.maxExtensions,
        startAt, endAt, currentEndAt: endAt,
      },
      include: auctionInclude,
    });
    await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'scheduled' } }).catch(() => undefined);
    return toAuctionDTO(a);
  }

  /** Only pending items can be edited. */
  async updateAuction(auctionId: number, input: AuctionConfigInput) {
    const existing = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!existing) throw new NotFoundException();
    if (existing.status !== 'pending') throw new BadRequestException({ code: 'AUCTION_NOT_EDITABLE' });
    const startAt = new Date(input.startAt), endAt = new Date(input.endAt);
    if (endAt <= startAt) throw new BadRequestException({ code: 'END_BEFORE_START' });
    const a = await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        productId: input.productId, startPrice: input.startPrice, stepPrice: input.stepPrice,
        extendWindowS: input.extendWindowS, extendByS: input.extendByS, maxExtensions: input.maxExtensions,
        startAt, endAt, currentEndAt: endAt, version: { increment: 1 },
      },
      include: auctionInclude,
    });
    return toAuctionDTO(a);
  }

  async removeAuction(auctionId: number) {
    const existing = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!existing) throw new NotFoundException();
    if (existing.status !== 'pending') throw new BadRequestException({ code: 'AUCTION_NOT_EDITABLE' });
    await this.prisma.auction.delete({ where: { id: auctionId } });
    return { ok: true };
  }

  /** Reorder: two-phase update to respect UNIQUE(campaign_id, sort_order). */
  async reorder(campaignId: number, auctionIds: number[]) {
    const existing = await this.prisma.auction.findMany({ where: { campaignId }, select: { id: true } });
    const ids = new Set(existing.map((a) => a.id));
    if (auctionIds.length !== ids.size || auctionIds.some((id) => !ids.has(id)) || new Set(auctionIds).size !== auctionIds.length)
      throw new BadRequestException({ code: 'ORDER_MISMATCH' });
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < auctionIds.length; i++)
        await tx.auction.update({ where: { id: auctionIds[i], campaignId }, data: { sortOrder: -(i + 1) } });
      for (let i = 0; i < auctionIds.length; i++)
        await tx.auction.update({ where: { id: auctionIds[i], campaignId }, data: { sortOrder: i + 1 } });
    });
    return this.get(campaignId);
  }

  /** "Start now": first pending item starts immediately, keeping its planned duration. */
  async startNow(campaignId: number) {
    const first = await this.prisma.auction.findFirst({ where: { campaignId, status: 'pending' }, orderBy: { sortOrder: 'asc' } });
    if (!first) throw new BadRequestException({ code: 'NO_PENDING_AUCTION' });
    const durationMs = first.endAt.getTime() - first.startAt.getTime();
    const now = new Date();
    const endAt = new Date(now.getTime() + durationMs);
    await this.prisma.auction.update({ where: { id: first.id }, data: { startAt: now, endAt, currentEndAt: endAt, version: { increment: 1 } } });
    await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'scheduled', startAt: now } });
    return this.get(campaignId);
  }
}
