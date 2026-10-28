import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../config/env';
import { AuthGuard } from '../common/auth.guard';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER } from './providers/auth-provider';
import { LocalAuthProvider } from './providers/local.provider';

@Global()
@Module({
  imports: [JwtModule.register({ secret: env.JWT_SECRET }), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: AUTH_PROVIDER, useClass: LocalAuthProvider }, // swap for an OIDC provider later
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
