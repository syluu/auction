import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginInput } from '@auction/shared';
import { UsersService } from '../users/users.service';
import { AUTH_PROVIDER, AuthProvider } from './providers/auth-provider';
import { SESSION_TTL_SEC, SessionPayload } from './session';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginInput) {
    const identity = await this.provider.authenticate(input);
    const user = await this.users.upsertFromIdentity(identity);
    return { user, token: this.issue(user) };
  }

  issue(user: { id: number; username: string; role: string; locale: string; displayName: string }): string {
    const payload: SessionPayload = { sub: user.id, username: user.username, role: user.role as any, locale: user.locale as any, displayName: user.displayName };
    return this.jwt.sign(payload, { expiresIn: SESSION_TTL_SEC });
  }
}
