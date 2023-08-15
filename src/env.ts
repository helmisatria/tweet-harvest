import { parseEnv, z } from "znv";

export const { DEV_ACCESS_TOKEN: ACCESS_TOKEN, HEADLESS_MODE } = parseEnv(process.env, {
  DEV_ACCESS_TOKEN: z.string().min(1).optional(),
  HEADLESS_MODE: z.boolean().default(true),
});
