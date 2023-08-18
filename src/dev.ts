import { crawl } from "./crawl";
import { ACCESS_TOKEN } from "./env";

crawl({
  ACCESS_TOKEN: ACCESS_TOKEN,
  SEARCH_KEYWORDS: `#FaktaPLTU`,
  // TWEET_THREAD_URL: "https://twitter.com/pangeransiahaan/status/1690590234009112576",
  TARGET_TWEET_COUNT: 100,
  OUTPUT_FILENAME: "pltu.csv",
  DELAY_EACH_TWEET_SECONDS: 1,
});
