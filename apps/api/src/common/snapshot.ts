import type { AuctionSnapshot } from '@auction/shared';
import { PrismaService } from '../prisma/prisma.service';
import { auctionInclude, toAuctionDTO, toBidDTO } from './dto';

export async function loadSnapshot(prisma: PrismaService, auctionId: number, bidLimit = 20): Promise<AuctionSnapshot | null> {
  const a = await prisma.auction.findUnique({ where: { id: auctionId }, include: auctionInclude });
  if (!a) return null;
  const bids = await prisma.bid.findMany({ where: { auctionId }, orderBy: { amount: 'desc' }, take: bidLimit, include: { user: true } });
  return { auction: toAuctionDTO(a), bids: bids.map(toBidDTO), serverTime: new Date().toISOString() };
}
