import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { autoBidSchema, placeBidSchema, type AutoBidInput, type PlaceBidInput } from '@auction/shared';
import { CurrentUser } from '../common/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import type { SessionPayload } from '../auth/session';
import { BidsService } from './bids.service';

@Controller('auctions/:id')
export class BidsController {
  constructor(private readonly bids: BidsService) {}

  @Post('bids')
  @HttpCode(201)
  place(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionPayload, @Body(new ZodPipe(placeBidSchema)) body: PlaceBidInput) {
    return this.bids.placeBid(id, { id: user.sub, displayName: user.displayName }, body.amount, body.idempotencyKey);
  }

  @Get('auto-bid') mine(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionPayload) { return this.bids.myAutoBid(id, user.sub); }

  @Put('auto-bid')
  set(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionPayload, @Body(new ZodPipe(autoBidSchema)) body: AutoBidInput) {
    return this.bids.setAutoBid(id, { id: user.sub, displayName: user.displayName }, body.maxPrice);
  }

  @Delete('auto-bid') remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionPayload) { return this.bids.removeAutoBid(id, user.sub); }
}
