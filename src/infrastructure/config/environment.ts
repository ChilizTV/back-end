import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(1000).max(65535).default(3001),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(50),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(50).optional(),

  API_FOOTBALL_KEY: z.string().min(20),

  NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),

  STREAM_WALLET_FACTORY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  BETTING_MATCH_FACTORY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  ADMIN_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),

  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('chiliz-football-api'),
  JWT_EXPIRY: z.string().default('24h'),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  REDIS_URL: z.string().url().optional(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Environment = z.infer<typeof envSchema>;

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parseResult.error.format(), null, 2));
  process.exit(1);
}

export const env = parseResult.data;
