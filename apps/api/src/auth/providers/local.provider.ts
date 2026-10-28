import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { LoginInput } from '@auction/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';
import { AuthProvider, Identity } from './auth-provider';

/**
 * Local provider.
 *  - AUTH_MODE=password: username + password, user must exist.
 *  - AUTH_MODE=username_only: any username logs in; unknown usernames are created as 'user'.
 *    Admin accounts (role=admin) always require their password.
 */
@Injectable()
export class LocalAuthProvider implements AuthProvider {
  readonly name = 'local';
  constructor(private readonly prisma: PrismaService) {}

  async authenticate(input: LoginInput): Promise<Identity> {
    const username = input.username.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (env.AUTH_MODE === 'username_only' && (!user || user.role !== 'admin')) {
      return { provider: 'local', externalId: username, username, displayName: user?.displayName ?? input.username, role: user?.role as any ?? 'user' };
    }

    if (!user || !user.passwordHash) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    if (!input.password || !(await argon2.verify(user.passwordHash, input.password)))
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });

    return { provider: 'local', externalId: username, username, displayName: user.displayName, role: user.role as any };
  }
}
