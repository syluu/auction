import { Controller, Get } from '@nestjs/common';
import { Public } from './auth.guard';

@Public()
@Controller()
export class HealthController {
  @Get('health') health() { return { ok: true, time: new Date().toISOString() }; }
  @Get('time') time() { return { serverTime: new Date().toISOString() }; }
}
