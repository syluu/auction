import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false });

  async onModuleDestroy() { await this.client.quit(); }

  /** Sliding-window-ish limiter: allow `limit` hits per `windowMs`. Returns true when allowed. */
  async allow(key: string, limit: number, windowMs: number): Promise<boolean> {
    const k = `rl:${key}`;
    const n = await this.client.incr(k);
    if (n === 1) await this.client.pexpire(k, windowMs);
    return n <= limit;
  }

  /** Try to acquire a short lock. Returns true if acquired. */
  async tryLock(key: string, ttlMs: number): Promise<boolean> {
    const r = await this.client.set(`lock:${key}`, '1', 'PX', ttlMs, 'NX');
    return r === 'OK';
  }
}
