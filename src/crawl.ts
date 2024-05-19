import * as fs from "fs";
import { pick } from "lodash";
import chalk from "chalk";
import path from "path";
import { Entry } from "./types/tweets.types";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { inputKeywords } from "./features/input-keywords";
import { listenNetworkRequests } from "./features/listen-network-requests";
import { calculateForRateLimit } from "./features/exponential-backoff";
import { HEADLESS_MODE } from "./env";
import {
  FILTERED_FIELDS,
  FOLDER_DESTINATION,
  FUlL_PATH_FOLDER_DESTINATION,
  NOW,
  TWITTER_SEARCH_ADVANCED_URL,
} from "./constants";
import { CACHE_KEYS, cache } from "./cache";
import { logError, scrollDown, scrollUp } from "./helpers/page.helper";
import Papa from "papaparse";
import _ from "lodash";

chromium.use(stealth());

let headerWritten = false;

function appendCsv(pathStr: string, jsonData: Record<string, any>[]) {
  const fileName = path.resolve(pathStr);

  const csv = Papa.unparse(jsonData, {
    quotes: true, // Wrap every datum in quotes
    header: !headerWritten, // Write header only if it's not written yet
    skipEmptyLines: true, // Don't write empty lines
  });

  headerWritten = true; // Set header as written

  fs.appendFileSync(fileName, csv);
  fs.appendFileSync(fileName, "\r\n");

  return fileName;
}

type StartCrawlTwitterParams = {
  twitterSearchUrl?: string;
};

export type CrawlParams = {
  ACCESS_TOKEN: string;
  SEARCH_KEYWORDS?: string;
  SEARCH_FROM_DATE?: string;
  SEARCH_TO_DATE?: string;
  TARGET_TWEET_COUNT?: number;
  DELAY_EACH_TWEET_SECONDS?: number;
  DELAY_EVERY_100_TWEETS_SECONDS?: number;
  DEBUG_MODE?: boolean;
  OUTPUT_FILENAME?: string;
  TWEET_THREAD_URL?: string;
  SEARCH_TAB?: "LATEST" | "TOP";
  CSV_INSERT_MODE?: "REPLACE" | "APPEND";
};

export async function crawl({
  ACCESS_TOKEN,
  SEARCH_KEYWORDS,
  TWEET_THREAD_URL,
  SEARCH_FROM_DATE,
  SEARCH_TO_DATE,
  TARGET_TWEET_COUNT = 10,
  // default delay each tweet activity: 3 seconds
  DELAY_EACH_TWEET_SECONDS = 3,
  DELAY_EVERY_100_TWEETS_SECONDS = 10,
  DEBUG_MODE,
  OUTPUT_FILENAME,
  SEARCH_TAB = "LATEST",
  CSV_INSERT_MODE = "REPLACE",
}: CrawlParams) {
  const CRAWL_MODE = TWEET_THREAD_URL ? "DETAIL" : "SEARCH";
  const SWITCHED_SEARCH_TAB = SEARCH_TAB === "TOP" ? "LATEST" : "TOP";

  const IS_DETAIL_MODE = CRAWL_MODE === "DETAIL";
  const IS_SEARCH_MODE = CRAWL_MODE === "SEARCH";
  const REACH_TIMEOUT_MAX = 3;
  const TIMEOUT_LIMIT = 20;

  let MODIFIED_SEARCH_KEYWORDS = SEARCH_KEYWORDS;

  const CURRENT_PACKAGE_VERSION = require("../package.json").version;

  const filename = (OUTPUT_FILENAME || `${SEARCH_KEYWORDS} ${NOW}`).trim().replace(".csv", "");
  const FILE_NAME = `${FOLDER_DESTINATION}/${filename}.csv`.replace(/ /g, "_").replace(/:/g, "-");

  console.info(chalk.blue("\nOpening twitter search page...\n"));

  if (CSV_INSERT_MODE === "REPLACE" && fs.existsSync(FILE_NAME)) {
    console.info(
      chalk.blue(`\nFound existing file ${FILE_NAME}, renaming to ${FILE_NAME.replace(".csv", ".old.csv")}`)
    );
    fs.renameSync(FILE_NAME, FILE_NAME.replace(".csv", ".old.csv"));
  }

  let TWEETS_NOT_FOUND_ON_CURRENT_TAB = false;

  const browser = await chromium.launch({ headless: HEADLESS_MODE });

  const context = await browser.newContext({
    screen: { width: 1240, height: 1080 },
    storageState: {
      cookies: [
        {
          name: "auth_token",
          value: ACCESS_TOKEN,
          domain: "x.com",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
        },
      ],
      origins: [],
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60 * 1000);

  listenNetworkRequests(page);

  async function startCrawlTwitter({
    twitterSearchUrl = TWITTER_SEARCH_ADVANCED_URL[SEARCH_TAB],
  }: StartCrawlTwitterParams = {}) {
    if (IS_DETAIL_MODE) {
      await page.goto(TWEET_THREAD_URL);
    } else {
      await page.goto(twitterSearchUrl);
    }

    // check is current page url is twitter login page (have /login in the url)
    const isLoggedIn = !page.url().includes("/login");

    if (!isLoggedIn) {
      logError("Invalid twitter auth token. Please check your auth token");

      return browser.close();
    }

    if (IS_SEARCH_MODE) {
      inputKeywords(page, {
        SEARCH_FROM_DATE,
        SEARCH_TO_DATE,
        SEARCH_KEYWORDS,
        MODIFIED_SEARCH_KEYWORDS,
      });
    }

    let timeoutCount = 0;
    let additionalTweetsCount = 0;
    let reachTimeout = 0;
    // count how many rate limit exception got raised
    let rateLimitCount = 0;

    const allData = {
      tweets: [],
    };

    async function scrollAndSave() {
      while (
        allData.tweets.length < TARGET_TWEET_COUNT &&
        (timeoutCount < TIMEOUT_LIMIT || reachTimeout < REACH_TIMEOUT_MAX)
      ) {
        if (timeoutCount > TIMEOUT_LIMIT && reachTimeout < REACH_TIMEOUT_MAX) {
          reachTimeout++;
          console.info(chalk.yellow(`Timeout reached ${reachTimeout} times, making sure again...`));
          timeoutCount = 0;

          await scrollUp(page);
          await page.waitForTimeout(2000);
          await scrollDown(page);
        }

        // Wait for the next response or 3 seconds, whichever comes first
        const response = await Promise.race([
          // includes "SearchTimeline" because it's the endpoint for the search result
          // or also includes "TweetDetail" because it's the endpoint for the tweet detail
          page.waitForResponse(
            (response) => response.url().includes("SearchTimeline") || response.url().includes("TweetDetail")
          ),
          page.waitForTimeout(1500),
        ]);

        if (response) {
          timeoutCount = 0;

          let tweets: Entry[] = [];

          let responseJson;

          try {
            responseJson = await response.json();
          } catch (error) {
            cache.set(CACHE_KEYS.GOT_TWEETS, false);

            if ((await response.text()).toLowerCase().includes("rate limit")) {
              logError(`Error parsing response json: ${JSON.stringify(response)}`);
              logError(
                `Most likely, you have already exceeded the Twitter rate limit. Read more on https://x.com/elonmusk/status/1675187969420828672.`
              );

              // wait for rate limit window passed before retrying
              await page.waitForTimeout(calculateForRateLimit(rateLimitCount++));

              // click retry
              await page.click("text=Retry");
              return await scrollAndSave(); // recursive call
            }

            break;
          }

          // reset the rate limit exception count
          rateLimitCount = 0;

          const isTweetDetail = responseJson.data.threaded_conversation_with_injections_v2;
          if (isTweetDetail) {
            tweets = responseJson.data?.threaded_conversation_with_injections_v2.instructions[0].entries;
          } else {
            tweets = responseJson.data?.search_by_raw_query.search_timeline.timeline?.instructions?.[0]?.entries;
          }

          if (!tweets) {
            logError("No more tweets found, please check your search criteria and csv file result");
            return;
          }

          if (!tweets.length) {
            // found text "not found" on the page
            if (await page.getByText("No results for").count()) {
              TWEETS_NOT_FOUND_ON_CURRENT_TAB = true;
              console.info("No tweets found for the search criteria");
              break;
            }
          }

          cache.set(CACHE_KEYS.GOT_TWEETS, true);

          const tweetContents = tweets
            .map((tweet) => {
              const isPromotedTweet = tweet.entryId.includes("promoted");

              if (IS_SEARCH_MODE && !tweet?.content?.itemContent?.tweet_results?.result) return null;
              if (IS_DETAIL_MODE) {
                if (!tweet?.content?.items?.[0]?.item?.itemContent) return null;
                const isMentionThreadCreator =
                  tweet?.content?.items?.[0]?.item?.itemContent?.tweet_results?.result?.legacy?.entities
                    ?.user_mentions?.[0];
                if (!isMentionThreadCreator) return null;
              }
              if (isPromotedTweet) return null;

              const result = IS_SEARCH_MODE
                ? tweet.content.itemContent.tweet_results.result
                : tweet.content.items[0].item.itemContent.tweet_results.result;

              if (!result.tweet?.core?.user_results && !result.core?.user_results) return null;

              const tweetContent = result.legacy || result.tweet.legacy;
              const userContent =
                result.core?.user_results?.result?.legacy || result.tweet.core.user_results.result.legacy;

              return {
                tweet: tweetContent,
                user: userContent,
              };
            })
            .filter((tweet) => tweet !== null);

          // add tweets and users to allData
          allData.tweets.push(...tweetContents);

          // write tweets to CSV file
          const comingTweets = tweetContents;

          if (!fs.existsSync(FOLDER_DESTINATION)) {
            const dir = fs.mkdirSync(FOLDER_DESTINATION, { recursive: true });
            const dirFullPath = path.resolve(dir);

            console.info(chalk.green(`Created new directory: ${dirFullPath}`));
          }

          const rows = comingTweets.map((current: (typeof tweetContents)[0]) => {
            const tweet = pick(current.tweet, FILTERED_FIELDS);

            const charsToReplace = ["\n", ",", '"', "⁦", "⁩", "’", "‘", "“", "”", "…", "—", "–", "•"];
            let cleanTweetText = tweet.full_text.replace(new RegExp(charsToReplace.join("|"), "g"), " ");

            // replace all emojis
            // Emoji regex pattern
            const emojiPattern =
              /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

            // Replace all instances of emojis in the string
            cleanTweetText = cleanTweetText.replace(emojiPattern, "");

            // replace all double spaces with single space
            cleanTweetText = cleanTweetText.replace(/\s\s+/g, " ");

            if (IS_DETAIL_MODE) {
              const firstWord = cleanTweetText.split(" ")[0];
              const replyToUsername = current.tweet.entities.user_mentions[0].screen_name;
              // firstWord example: "@someone", the 0 index is " and the 1 index is @
              if (firstWord[1] === "@") {
                // remove the first word
                cleanTweetText = cleanTweetText.replace(`@${replyToUsername} `, "");
              }
            }

            tweet["full_text"] = cleanTweetText;
            tweet["username"] = current.user.screen_name;
            tweet["tweet_url"] = `https://x.com/${current.user.screen_name}/status/${tweet.id_str}`;
            tweet["image_url"] = current.tweet.entities?.media?.[0]?.media_url_https || "";
            tweet["location"] = current.user.location || "";
            tweet["in_reply_to_screen_name"] = current.tweet.in_reply_to_screen_name || "";

            return tweet;
          });

          const sortedArrayOfObjects = _.map(rows, (obj) => _.fromPairs(_.sortBy(Object.entries(obj), 0)));

          const fullPathFilename = appendCsv(FILE_NAME, sortedArrayOfObjects);

          console.info(chalk.blue(`\n\nYour tweets saved to: ${fullPathFilename}`));

          // progress:
          console.info(chalk.yellow(`Total tweets saved: ${allData.tweets.length}`));
          additionalTweetsCount += comingTweets.length;

          // for every multiple of 100, wait for 5 seconds
          if (additionalTweetsCount > 100) {
            additionalTweetsCount = 0;
            if (DELAY_EVERY_100_TWEETS_SECONDS) {
              console.info(chalk.gray(`\n--Taking a break, waiting for ${DELAY_EVERY_100_TWEETS_SECONDS} seconds...`));
              await page.waitForTimeout(DELAY_EVERY_100_TWEETS_SECONDS * 1000);
            }
          } else if (additionalTweetsCount > 20) {
            await page.waitForTimeout(DELAY_EACH_TWEET_SECONDS * 1000);
          }

          cache.set(CACHE_KEYS.GOT_TWEETS, false);
        } else {
          if (cache.get(CACHE_KEYS.GOT_TWEETS) === false) {
            timeoutCount++;

            if (timeoutCount === 1) {
              process.stdout.write(chalk.gray(`\n-- Scrolling... (${timeoutCount})`));
            } else {
              process.stdout.write(chalk.gray(` (${timeoutCount})`));
            }

            if (timeoutCount > TIMEOUT_LIMIT) {
              console.info(chalk.yellow("No more tweets found, please check your search criteria and csv file result"));
              break;
            }
          }

          await scrollDown(page);
          await scrollAndSave(); // call the function again to resume scrolling
        }

        await scrollDown(page);
      }
    }

    /**
     * Initial scroll and save tweets then it will do recursive call
     */
    await scrollAndSave();

    if (allData.tweets.length) {
      console.info(`Got ${allData.tweets.length} tweets, done scrolling...`);
    } else {
      console.info("No tweets found for the search criteria");
    }
  }

  try {
    await startCrawlTwitter();

    if (TWEETS_NOT_FOUND_ON_CURRENT_TAB) {
      console.info(`No tweets found on "${SEARCH_TAB}" tab, trying "${SWITCHED_SEARCH_TAB}" tab...`);

      await startCrawlTwitter({
        twitterSearchUrl: TWITTER_SEARCH_ADVANCED_URL[SWITCHED_SEARCH_TAB],
      });
    }
  } catch (error) {
    logError(error);
    console.info(chalk.blue(`Keywords: ${MODIFIED_SEARCH_KEYWORDS}`));
    console.info(chalk.yellowBright("Twitter Harvest v", CURRENT_PACKAGE_VERSION));

    const errorFilename = FUlL_PATH_FOLDER_DESTINATION + `/Error-${NOW}.png`.replace(/ /g, "_").replace(".csv", "");

    await page.screenshot({ path: path.resolve(errorFilename) }).then(() => {
      console.log(
        chalk.red(
          `\nIf you need help, please send this error screenshot to the maintainer, it was saved to "${path.resolve(
            errorFilename
          )}"`
        )
      );
    });
  } finally {
    if (!DEBUG_MODE) {
      await browser.close();
    }
  }
}
