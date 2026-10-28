import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BidsModule } from '../bids/bids.module';
import { SchedulerService } from './scheduler.service';

@Module({ imports: [RealtimeModule, BidsModule], providers: [SchedulerService] })
export class SchedulerModule {}
