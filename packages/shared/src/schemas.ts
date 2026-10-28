import { z } from 'zod';

export const i18nText = z.object({
  vi: z.string().min(1).max(500),
  en: z.string().max(500).optional(),
});

/** Decimal string: digits with optional 2 decimals. */
export const money = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).replace(/[^0-9.]/g, ''))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'invalid amount'));

export const loginSchema = z.object({
  username: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(1).max(200).optional(),
});

export const localeSchema = z.enum(['vi', 'en']);
export const currencySchema = z.enum(['VND', 'USD']);

export const placeBidSchema = z.object({
  amount: money,
  idempotencyKey: z.string().uuid(),
});

export const autoBidSchema = z.object({ maxPrice: money });

export const settingsInput = z.object({ autoBidEnabled: z.boolean() });

export const productInput = z.object({
  name: i18nText,
  description: z.object({ vi: z.string().max(2000).default(''), en: z.string().max(2000).optional() }).default({ vi: '' }),
  images: z.array(z.string().max(1000)).max(20).default([]),
  originalPrice: money,
});

export const auctionConfig = z.object({
  productId: z.number().int().positive(),
  startPrice: money,
  stepPrice: money,
  extendWindowS: z.number().int().min(0).max(3600).default(30),
  extendByS: z.number().int().min(0).max(3600).default(30),
  maxExtensions: z.number().int().min(0).nullable().default(null),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
});

export const campaignInput = z.object({
  name: i18nText,
  currency: currencySchema.default('VND'),
  startAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const reorderInput = z.object({
  auctionIds: z.array(z.number().int().positive()).min(1).max(500),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type AutoBidInput = z.infer<typeof autoBidSchema>;
export type SettingsInput = z.infer<typeof settingsInput>;
export type ProductInput = z.infer<typeof productInput>;
export type AuctionConfigInput = z.infer<typeof auctionConfig>;
export type CampaignInput = z.infer<typeof campaignInput>;
