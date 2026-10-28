import { ConflictException, Injectable } from '@nestjs/common';

const RESERVED_NAMES = ['admin', 'administrator', 'system', 'moderator', 'quản trị', 'quan tri', 'ban tổ chức', 'btc'];
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import type { Identity } from '../auth/providers/auth-provider';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) { return this.prisma.user.findUnique({ where: { id } }); }

  /** Creates or links the internal user for an identity. Internal id never changes. */
  async upsertFromIdentity(identity: Identity) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ authProvider: identity.provider, externalId: identity.externalId }, { username: identity.username }] },
    });
    if (existing) {
      if (!existing.externalId) {
        return this.prisma.user.update({ where: { id: existing.id }, data: { authProvider: identity.provider, externalId: identity.externalId } });
      }
      return existing;
    }
    return this.prisma.user.create({
      data: {
        username: identity.username,
        email: identity.email,
        displayName: identity.displayName,
        authProvider: identity.provider,
        externalId: identity.externalId,
        role: identity.role ?? 'user',
      },
    });
  }

  async update(id: number, data: { locale?: string; displayName?: string }) {
    if (data.displayName !== undefined) {
      const name = data.displayName.replace(/[\p{C}]/gu, '').trim(); // strip control characters
      if (name.length < 1 || RESERVED_NAMES.includes(name.toLowerCase())) throw new ConflictException({ code: 'DISPLAY_NAME_RESERVED' });
      const clash = await this.prisma.user.findFirst({ where: { id: { not: id }, OR: [{ displayName: { equals: name, mode: 'insensitive' } }, { username: { equals: name, mode: 'insensitive' } }] } });
      if (clash) throw new ConflictException({ code: 'DISPLAY_NAME_TAKEN' });
      data = { ...data, displayName: name };
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async ensureAdmin(username: string, password: string) {
    const passwordHash = await argon2.hash(password);
    return this.prisma.user.upsert({
      where: { username },
      update: { role: 'admin', passwordHash },
      create: { username, displayName: 'Admin', role: 'admin', passwordHash, authProvider: 'local', externalId: username },
    });
  }
}
