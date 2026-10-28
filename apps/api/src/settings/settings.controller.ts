import { Body, Controller, Get, Put } from '@nestjs/common';
import { settingsInput, type SettingsInput } from '@auction/shared';
import { AdminOnly, Public } from '../common/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { SettingsService } from './settings.service';

@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}
  @Public() @Get('settings') get() { return this.settings.get(); }
  @AdminOnly() @Put('admin/settings') set(@Body(new ZodPipe(settingsInput)) body: SettingsInput) { return this.settings.set(body); }
}
