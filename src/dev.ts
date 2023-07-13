import { config } from "dotenv";
import { crawl } from "./crawl";
import { parseEnv } from "znv";
import { z } from "zod";

config();

export const { DEV_ACCESS_TOKEN: ACCESS_TOKEN } = parseEnv(process.env, {
  DEV_ACCESS_TOKEN: z.string().min(1),
});

crawl({
  ACCESS_TOKEN: ACCESS_TOKEN,
  SEARCH_KEYWORDS: `piala dunia u-20 until:2023-03-28 since:2023-03-01`,
  TARGET_TWEET_COUNT: 40,
  OUTPUT_FILENAME: "jokowi.csv",
  DELAY_EACH_TWEET_SECONDS: 1,
});
