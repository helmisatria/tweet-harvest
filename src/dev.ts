import { crawl } from "./crawl";

import { config } from "dotenv";

config();

crawl({
  ACCESS_TOKEN: process.env.DEV_ACCESS_TOKEN,
  SEARCH_KEYWORDS: `"jokowi"`,
  TARGET_TWEET_COUNT: 40,
  OUTPUT_FILENAME: "presiden.csv",
  DELAY_EACH_TWEET_SECONDS: 1,
});
