import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';

@Module({ imports: [RealtimeModule], controllers: [AuctionsController], providers: [AuctionsService], exports: [AuctionsService] })
export class AuctionsModule {}
