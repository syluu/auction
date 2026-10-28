import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AppSettings { autoBidEnabled: boolean }
const DEFAULTS: AppSettings = { autoBidEnabled: true };

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(db: Db = this.prisma): Promise<AppSettings> {
    const rows = await db.setting.findMany();
    const out: AppSettings = { ...DEFAULTS };
    for (const r of rows) if (r.key in out) (out as any)[r.key] = r.value;
    return out;
  }

  async set(patch: Partial<AppSettings>): Promise<AppSettings> {
    for (const [key, value] of Object.entries(patch)) {
      await this.prisma.setting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
    }
    return this.get();
  }
}
