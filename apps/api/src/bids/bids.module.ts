import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({ imports: [RealtimeModule], controllers: [BidsController], providers: [BidsService], exports: [BidsService] })
export class BidsModule {}
