import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuctionStatus } from '@prisma/client';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';

const listQuery = z.object({ status: z.nativeEnum(AuctionStatus).optional(), campaignId: z.coerce.number().int().positive().optional() });
const limitQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });
import { AdminOnly, CurrentUser, Public } from '../common/auth.guard';
import { AuctionsService } from './auctions.service';
import type { SessionPayload } from '../auth/session';

@Controller()
export class AuctionsController {
  constructor(private readonly auctions: AuctionsService) {}

  @Public() @Get('auctions')
  list(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) { return this.auctions.list(q.status, q.campaignId); }

  @Public() @Get('auctions/:id') get(@Param('id', ParseIntPipe) id: number) { return this.auctions.get(id); }

  @Public() @Get('auctions/:id/bids')
  bids(@Param('id', ParseIntPipe) id: number, @Query(new ZodPipe(limitQuery)) q: z.infer<typeof limitQuery>) { return this.auctions.bids(id, q.limit); }

  @Get('me/bids') myBids(@CurrentUser() user: SessionPayload) { return this.auctions.myBids(user.sub); }

  @AdminOnly() @Post('admin/auctions/:id/cancel') cancel(@Param('id', ParseIntPipe) id: number) { return this.auctions.cancel(id); }
}
