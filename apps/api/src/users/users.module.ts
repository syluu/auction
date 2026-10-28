import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { env } from '../config/env';
import { UsersService } from './users.service';

@Module({ providers: [UsersService], exports: [UsersService] })
export class UsersModule implements OnApplicationBootstrap {
  constructor(private readonly users: UsersService) {}

  /** Make sure the admin account from ADMIN_USERNAME / ADMIN_PASSWORD exists, so a fresh deployment is usable without seeding. */
  async onApplicationBootstrap() {
    await this.users.ensureAdmin(env.ADMIN_USERNAME, env.ADMIN_PASSWORD);
    new Logger('Users').log(`admin account "${env.ADMIN_USERNAME}" ready`);
  }
}
