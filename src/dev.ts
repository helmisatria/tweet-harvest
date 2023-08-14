import { config } from "dotenv";
import { crawl } from "./crawl";
import { parseEnv } from "znv";
import { z } from "zod";

config();

export const { DEV_ACCESS_TOKEN: ACCESS_TOKEN, HEADLESS_MODE } = parseEnv(process.env, {
  DEV_ACCESS_TOKEN: z.string().min(1),
  HEADLESS_MODE: z.boolean().default(true),
});

crawl({
  ACCESS_TOKEN: ACCESS_TOKEN,
  SEARCH_KEYWORDS: `presiden until:2023-03-28 since:2023-03-01`,
  // TWEET_DETAIL_URL: "https://twitter.com/pangeransiahaan/status/1690590234009112576",
  TARGET_TWEET_COUNT: 500,
  OUTPUT_FILENAME: "presiden.csv",
  DELAY_EACH_TWEET_SECONDS: 1,
});
