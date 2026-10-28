import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(8),
  AUTH_MODE: z.enum(['password', 'username_only']).default('password'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin123'),
  SCHEDULER_INTERVAL_MS: z.coerce.number().default(500),
  AUTO_BID_DELAY_MS: z.coerce.number().min(0).default(1000),   // auto bid replies this long after the last bid
  TRUST_PROXY: z.coerce.boolean().default(false),   // true when behind nginx so rate limits see the real client IP
});

export const env = schema.parse(process.env);

if (env.NODE_ENV === 'production') {
  if (env.AUTH_MODE === 'username_only') throw new Error('AUTH_MODE=username_only is not allowed in production');
  if (env.JWT_SECRET.length < 32 || /change-me|secret/i.test(env.JWT_SECRET)) throw new Error('JWT_SECRET must be a random string of at least 32 characters in production');
  if (['admin123', 'admin', 'password', 'change-me'].includes(env.ADMIN_PASSWORD) || env.ADMIN_PASSWORD.length < 10) throw new Error('ADMIN_PASSWORD is too weak for production');
}
