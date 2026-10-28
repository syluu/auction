import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException, createParamDecorator, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SESSION_COOKIE, SessionPayload } from '../auth/session';

export const Public = () => SetMetadata('isPublic', true);
export const AdminOnly = () => SetMetadata('adminOnly', true);
/** Resolves the session user; `optional` lets public routes see who is asking (e.g. to flag "you are leading"). */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionPayload | undefined => {
  return ctx.switchToHttp().getRequest().user;
});

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [ctx.getHandler(), ctx.getClass()]);
    const adminOnly = this.reflector.getAllAndOverride<boolean>('adminOnly', [ctx.getHandler(), ctx.getClass()]);
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      try { req.user = this.jwt.verify<SessionPayload>(token); } catch { req.user = undefined; }
    }
    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException({ code: 'UNAUTHENTICATED' });
    if (adminOnly && req.user.role !== 'admin') throw new ForbiddenException({ code: 'ADMIN_ONLY' });
    return true;
  }
}
