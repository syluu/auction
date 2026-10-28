import { Body, Controller, Get, HttpException, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RedisService } from '../redis/redis.service';
import { loginSchema, localeSchema } from '@auction/shared';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentUser, Public } from '../common/auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SESSION_COOKIE, SESSION_TTL_SEC, SessionPayload } from './session';
import { env } from '../config/env';
import { toUserDTO } from '../common/dto';

const patchMe = z.object({ locale: localeSchema.optional(), displayName: z.string().trim().min(1).max(60).optional() });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService, private readonly redis: RedisService) {}

  @Public()
  @Post('login')
  async login(@Body(new ZodPipe(loginSchema)) body: z.infer<typeof loginSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // brute-force protection: 10 attempts / min per IP and 5 / min per account
    const okIp = await this.redis.allow(`login:ip:${req.ip}`, 10, 60_000);
    const okUser = await this.redis.allow(`login:user:${body.username.toLowerCase()}`, 5, 60_000);
    if (!okIp || !okUser) throw new HttpException({ code: 'TOO_MANY_ATTEMPTS' }, 429);
    const { user, token } = await this.auth.login(body);
    this.setCookie(res, token);
    return { user: toUserDTO(user), authMode: env.AUTH_MODE };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Public()
  @Get('me')
  async me(@CurrentUser() s?: SessionPayload) {
    if (!s) return { user: null, authMode: env.AUTH_MODE };
    const user = await this.users.findById(s.sub);
    return { user: user ? toUserDTO(user) : null, authMode: env.AUTH_MODE };
  }

  @Patch('me')
  async patch(@CurrentUser() s: SessionPayload, @Body(new ZodPipe(patchMe)) body: z.infer<typeof patchMe>, @Res({ passthrough: true }) res: Response) {
    if (!s) throw new UnauthorizedException();
    const user = await this.users.update(s.sub, body);
    this.setCookie(res, this.auth.issue(user)); // refresh claims (locale) in the cookie
    return { user: toUserDTO(user) };
  }

  private setCookie(res: Response, token: string) {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.WEB_ORIGIN.startsWith('https://'),
      maxAge: SESSION_TTL_SEC * 1000,
      path: '/',
    });
  }
}
