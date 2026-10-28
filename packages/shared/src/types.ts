export type Locale = 'vi' | 'en';
export type Currency = 'VND' | 'USD';
export type Role = 'user' | 'admin';
export type AuctionStatus = 'pending' | 'live' | 'ended' | 'cancelled';
export type CampaignStatus = 'draft' | 'scheduled' | 'live' | 'finished';

/** Bilingual text. `en` is optional and falls back to `vi`. */
export interface I18nText { vi: string; en?: string }

export interface UserDTO {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  locale: Locale;
}

export interface ProductDTO {
  id: number;
  name: I18nText;
  description: I18nText;
  images: string[];
  originalPrice: string;
}

/** All money values travel as decimal strings to avoid float rounding. */
export interface AuctionDTO {
  id: number;
  campaignId: number;
  sortOrder: number;
  status: AuctionStatus;
  currency: Currency;
  product: ProductDTO;
  startPrice: string;
  stepPrice: string;
  extendWindowS: number;
  extendByS: number;
  maxExtensions: number | null;
  extensionCount: number;
  startAt: string;
  endAt: string;
  currentEndAt: string;
  currentPrice: string | null;
  leadingUserId: number | null;
  leadingBidderMasked: string | null;
  bidCount: number;
  version: number;
}

export interface BidDTO {
  id: number;
  auctionId: number;
  amount: string;
  bidderMasked: string;
  userId: number;
  isAuto: boolean;
  createdAt: string;
}

export interface AutoBidDTO {
  auctionId: number;
  maxPrice: string;
  active: boolean;
  updatedAt: string;
}

export interface SettingsDTO { autoBidEnabled: boolean }

export interface CampaignDTO {
  id: number;
  name: I18nText;
  currency: Currency;
  status: CampaignStatus;
  startAt: string | null;
  auctions: AuctionDTO[];
}

export interface ResultDTO {
  auctionId: number;
  campaignId: number;
  productName: I18nText;
  productImage: string | null;
  winnerMasked: string | null;
  winnerId: number | null;
  startPrice: string;
  finalPrice: string | null;
  priceGain: string | null;
  endedAt: string;
}

export interface AuctionSnapshot {
  auction: AuctionDTO;
  bids: BidDTO[];
  serverTime: string;
}

export type BidErrorCode =
  | 'AUCTION_CLOSED'
  | 'ALREADY_LEADING'
  | 'BID_TOO_LOW'
  | 'BID_INVALID_AMOUNT'
  | 'RATE_LIMITED'
  | 'AUTO_BID_DISABLED';

export interface BidRejection {
  code: BidErrorCode;
  minAllowed?: string;
  currentPrice?: string | null;
  version?: number;
}
