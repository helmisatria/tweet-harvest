import { crawl } from "./crawl";
import { ACCESS_TOKEN } from "./env";

crawl({
  ACCESS_TOKEN: ACCESS_TOKEN,
  SEARCH_KEYWORDS: `Gibran`,
  // TWEET_THREAD_URL: "https://x.com/pangeransiahaan/status/1690590234009112576",
  TARGET_TWEET_COUNT: 100,
  OUTPUT_FILENAME: "gibran.csv",
  DELAY_EACH_TWEET_SECONDS: 0,
  DELAY_EVERY_100_TWEETS_SECONDS: 0,
  SEARCH_TAB: "LATEST",
  CSV_INSERT_MODE: "REPLACE",
});
