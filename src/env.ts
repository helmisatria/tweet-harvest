import { config } from "dotenv";
import { parseEnv, z } from "znv";

config();

export const { DEV_ACCESS_TOKEN: ACCESS_TOKEN, HEADLESS_MODE, ENABLE_EXPONENTIAL_BACKOFF } = parseEnv(process.env, {
  DEV_ACCESS_TOKEN: z.string().min(1).optional(),
  HEADLESS_MODE: z.boolean().default(true),
  ENABLE_EXPONENTIAL_BACKOFF: z.boolean().default(false),
});
