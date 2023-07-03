import { crawl } from "./crawl";

crawl({
  ACCESS_TOKEN: "253d37a02089b6b12317bc8e8bef9e64601f768",
  SEARCH_KEYWORDS: "covid",
  // SEARCH_FROM_DATE: argv.from,
  // SEARCH_TO_DATE: argv.to,
  TARGET_TWEET_COUNT: 100,
  // DELAY_EACH_TWEET_SECONDS: argv.delay_each_tweet,
});
