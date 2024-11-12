import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables
config();

// Environment variable validation schema
const envSchema = z.object({
  PORT: z.string().default('8080'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OPENAI_API_KEY: z.string()
});

// Validate environment variables
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.format());
  process.exit(1);
}

export const CONFIG = {
  port: parseInt(env.data.PORT, 10),
  logLevel: env.data.LOG_LEVEL,
  openai: {
    apiKey: env.data.OPENAI_API_KEY,
    model: 'gpt-4o-realtime-preview-2024-10-01',
    baseUrl: 'wss://api.openai.com/v1/realtime'
  }
} as const;