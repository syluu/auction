import type { AuctionDTO, BidDTO, CampaignDTO, ProductDTO, ResultDTO, UserDTO } from '@auction/shared';
import { Prisma } from '@prisma/client';

type Dec = Prisma.Decimal | null | undefined;
export const dec = (d: Dec): string | null => (d === null || d === undefined ? null : d.toString());
export const decReq = (d: Prisma.Decimal): string => d.toString();

export type AuctionRow = Prisma.AuctionGetPayload<{ include: { product: true; campaign: true; leader: true } }>;
export const auctionInclude = { product: true, campaign: true, leader: true } as const;

export function toUserDTO(u: { id: number; username: string; displayName: string; role: string; locale: string }): UserDTO {
  return { id: u.id, username: u.username, displayName: u.displayName, role: u.role as UserDTO['role'], locale: u.locale as UserDTO['locale'] };
}

export function toProductDTO(p: { id: number; name: any; description: any; images: any; originalPrice: Prisma.Decimal }): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? { vi: '' },
    images: Array.isArray(p.images) ? p.images : [],
    originalPrice: decReq(p.originalPrice),
  };
}

export function toAuctionDTO(a: AuctionRow): AuctionDTO {
  return {
    id: a.id,
    campaignId: a.campaignId,
    sortOrder: a.sortOrder,
    status: a.status,
    currency: a.campaign.currency.trim() as AuctionDTO['currency'],
    product: toProductDTO(a.product),
    startPrice: decReq(a.startPrice),
    stepPrice: decReq(a.stepPrice),
    extendWindowS: a.extendWindowS,
    extendByS: a.extendByS,
    maxExtensions: a.maxExtensions,
    extensionCount: a.extensionCount,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    currentEndAt: a.currentEndAt.toISOString(),
    currentPrice: dec(a.currentPrice),
    leadingUserId: a.leadingUserId,
    leadingBidderMasked: a.leader ? a.leader.displayName : null,
    bidCount: a.bidCount,
    version: a.version,
  };
}

export function toBidDTO(b: { id: number; auctionId: number; userId: number; amount: Prisma.Decimal; isAuto: boolean; createdAt: Date; user: { displayName: string } }): BidDTO {
  return { id: b.id, auctionId: b.auctionId, userId: b.userId, amount: decReq(b.amount), bidderMasked: b.user.displayName, isAuto: b.isAuto, createdAt: b.createdAt.toISOString() };
}

export function toCampaignDTO(c: { id: number; name: any; currency: string; status: string; startAt: Date | null; auctions: AuctionRow[] }): CampaignDTO {
  return {
    id: c.id,
    name: c.name,
    currency: c.currency.trim() as CampaignDTO['currency'],
    status: c.status as CampaignDTO['status'],
    startAt: c.startAt ? c.startAt.toISOString() : null,
    auctions: c.auctions.map(toAuctionDTO),
  };
}

export function toResultDTO(r: Prisma.AuctionResultGetPayload<{ include: { winner: true; auction: { include: { product: true } } } }>): ResultDTO {
  const images = Array.isArray(r.auction.product.images) ? (r.auction.product.images as string[]) : [];
  return {
    auctionId: r.auctionId,
    campaignId: r.campaignId,
    productName: r.auction.product.name as any,
    productImage: images[0] ?? null,
    winnerMasked: r.winner ? r.winner.displayName : null,
    winnerId: r.winnerId,
    startPrice: decReq(r.startPrice),
    finalPrice: dec(r.finalPrice),
    priceGain: dec(r.priceGain),
    endedAt: r.endedAt.toISOString(),
  };
}
