import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { env } from './config/env';
import { ZodExceptionFilter } from './common/zod.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['log', 'warn', 'error'] });
  app.setGlobalPrefix('api');
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  if (env.TRUST_PROXY) app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // uploads are embedded by the web origin
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalFilters(new ZodExceptionFilter());
  app.useStaticAssets(join(process.cwd(), env.UPLOAD_DIR), { prefix: '/uploads/' });
  app.enableShutdownHooks();
  await app.listen(env.PORT);
  console.log(`API listening on http://localhost:${env.PORT}/api  (auth mode: ${env.AUTH_MODE})`);
}
bootstrap();
