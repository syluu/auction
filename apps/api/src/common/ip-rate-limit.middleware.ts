import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RedisService } from '../redis/redis.service';

/** Coarse per-IP ceiling for the whole API (600 req/min). Endpoint-specific limits (bids, login) are stricter. */
@Injectable()
export class IpRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly redis: RedisService) {}
  async use(req: Request, res: Response, next: NextFunction) {
    try {
      if (!(await this.redis.allow(`ip:${req.ip}`, 600, 60_000))) {
        res.status(429).json({ code: 'RATE_LIMITED' });
        return;
      }
    } catch { /* Redis hiccup: fail open */ }
    next();
  }
}
