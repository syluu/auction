import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { IpRateLimitMiddleware } from './common/ip-rate-limit.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AuctionsModule } from './auctions/auctions.module';
import { BidsModule } from './bids/bids.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthController } from './common/health.controller';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CampaignsModule,
    AuctionsModule,
    BidsModule,
    RealtimeModule,
    SchedulerModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { consumer.apply(IpRateLimitMiddleware).forRoutes('*'); }
}
