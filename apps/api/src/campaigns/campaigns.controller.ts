import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { auctionConfig, campaignInput, reorderInput, type AuctionConfigInput, type CampaignInput } from '@auction/shared';
import { z } from 'zod';
import { AdminOnly, Public } from '../common/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService, private readonly prisma: PrismaService) {}

  // ---- public ----
  @Public() @Get('campaigns/current') current() { return this.campaigns.current(); }
  @Public() @Get('campaigns/:id') get(@Param('id', ParseIntPipe) id: number) { return this.campaigns.get(id); }
  @Public() @Get('campaigns/:id/results') results(@Param('id', ParseIntPipe) id: number) { return this.campaigns.results(id); }

  // ---- admin ----
  @AdminOnly() @Get('admin/campaigns') list() { return this.campaigns.list(); }
  @AdminOnly() @Post('admin/campaigns') create(@Body(new ZodPipe(campaignInput)) body: CampaignInput) { return this.campaigns.create(body); }
  @AdminOnly() @Put('admin/campaigns/:id') update(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(campaignInput)) body: CampaignInput) { return this.campaigns.update(id, body); }
  @AdminOnly() @Post('admin/campaigns/:id/auctions') addAuction(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(auctionConfig)) body: AuctionConfigInput) { return this.campaigns.addAuction(id, body); }
  @AdminOnly() @Put('admin/auctions/:id') updateAuction(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(auctionConfig)) body: AuctionConfigInput) { return this.campaigns.updateAuction(id, body); }
  @AdminOnly() @Delete('admin/auctions/:id') removeAuction(@Param('id', ParseIntPipe) id: number) { return this.campaigns.removeAuction(id); }
  @AdminOnly() @Put('admin/campaigns/:id/order') reorder(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(reorderInput)) body: z.infer<typeof reorderInput>) { return this.campaigns.reorder(id, body.auctionIds); }
  @AdminOnly() @Post('admin/campaigns/:id/start') start(@Param('id', ParseIntPipe) id: number) { return this.campaigns.startNow(id); }

  @AdminOnly() @Get('admin/campaigns/:id/export.csv')
  async exportCsv(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const rows = await this.prisma.auctionResult.findMany({
      where: { campaignId: id }, orderBy: { priceGain: 'desc' },
      include: { winner: true, auction: { include: { product: true } } },
    });
    // quote every cell and neutralise spreadsheet formula injection (=, +, -, @, tab, CR)
    const esc = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    const lines = ['auction_id,product,winner_username,winner_name,start_price,final_price,price_gain,ended_at'];
    for (const r of rows) {
      lines.push([r.auctionId, (r.auction.product.name as any)?.vi, r.winner?.username, r.winner?.displayName, r.startPrice, r.finalPrice, r.priceGain, r.endedAt.toISOString()].map(esc).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-results.csv"`);
    res.send('﻿' + lines.join('\n'));
  }
}
