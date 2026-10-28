import type { AuctionDTO, AuctionSnapshot, AuctionStatus, I18nText } from './types';

/** Socket.IO event names shared by API and web. */
export const EV = {
  // client -> server
  JOIN_AUCTION: 'auction:join',
  LEAVE_AUCTION: 'auction:leave',
  JOIN_CAMPAIGN: 'campaign:join',
  LEAVE_CAMPAIGN: 'campaign:leave',
  // server -> client
  AUCTION_STATE: 'auction:state',
  AUCTION_BID: 'auction:bid',
  AUCTION_STARTED: 'auction:started',
  AUCTION_ENDED: 'auction:ended',
  USER_OUTBID: 'user:outbid',
  USER_WON: 'user:won',
  CAMPAIGN_TICK: 'campaign:tick',
  TIME_SYNC: 'time:sync',
} as const;

export interface AuctionBidEvent {
  auctionId: number;
  amount: string;
  bidderMasked: string;
  bidderId: number;
  isAuto: boolean;
  bidCount: number;
  currentEndAt: string;
  extended: boolean;
  version: number;
  serverTime: string;
}

export interface AuctionStatusEvent {
  auctionId: number;
  campaignId: number;
  status: AuctionStatus;
  version: number;
  winnerMasked?: string | null;
  finalPrice?: string | null;
  cancelled?: boolean;
  serverTime: string;
  auction?: AuctionDTO;
}

export interface UserOutbidEvent {
  auctionId: number;
  productName: I18nText;
  yourBid: string;
  newPrice: string;
  currentEndAt: string;
  currency: string;
}

export interface UserWonEvent {
  auctionId: number;
  productName: I18nText;
  finalPrice: string;
  currency: string;
}

export interface CampaignTickEvent {
  auctionId: number;
  campaignId: number;
  currentPrice: string | null;
  currentEndAt: string;
  status: AuctionStatus;
  bidCount: number;
  version: number;
  serverTime: string;
  lastBidderMasked?: string | null;
  leadingUserId?: number | null;
  extended?: boolean;
}

export interface TimeSyncEvent { serverTime: string }

export type { AuctionSnapshot };
