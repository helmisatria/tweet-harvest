import { ElementHandle } from "@playwright/test";
import * as fs from "fs";
import dayjs from "dayjs";
import { pick } from "lodash";
import chalk from "chalk";
import path from "path";
import { TweetResponseData } from "./types/response-tweet";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { inputKeywords } from "./features/input-keywords";
import { listenNetworkRequests } from "./features/listen-network-requests";

chromium.use(stealth());

const NOW = dayjs().format("DD-MM-YYYY HH-mm-ss");
let headerWritten = false;

function appendCsv(pathStr: string, contents: any, cb?) {
  const dirName = path.dirname(pathStr);
  const fileName = path.resolve(pathStr);

  fs.mkdirSync(dirName, { recursive: true });
  fs.appendFileSync(fileName, contents, cb);

  return fileName;
}

const filteredFields = [
  "created_at",
  "id_str",
  "full_text",
  "quote_count",
  "reply_count",
  "retweet_count",
  "favorite_count",
  "lang",
  "user_id_str",
  "conversation_id_str",
  "username",
  "tweet_url",
];

type StartCrawlTwitterParams = {
  twitterSearchUrl?: string;
};

export async function crawl({
  ACCESS_TOKEN,
  SEARCH_KEYWORDS,
  SEARCH_FROM_DATE,
  SEARCH_TO_DATE,
  TARGET_TWEET_COUNT = 10,
  // default delay each tweet activity: 3 seconds
  DELAY_EACH_TWEET_SECONDS = 3,
  DEBUG_MODE,
  OUTPUT_FILENAME,
}: {
  ACCESS_TOKEN: string;
  SEARCH_KEYWORDS: string;
  SEARCH_FROM_DATE?: string;
  SEARCH_TO_DATE?: string;
  TARGET_TWEET_COUNT?: number;
  DELAY_EACH_TWEET_SECONDS?: number;
  DEBUG_MODE?: boolean;
  OUTPUT_FILENAME?: string;
}) {
  let MODIFIED_SEARCH_KEYWORDS = SEARCH_KEYWORDS;

  const CURRENT_PACKAGE_VERSION = require("../package.json").version;

  // change spaces to _
  const FOLDER_DESTINATION = "./tweets-data";
  const FUlL_PATH_FOLDER_DESTINATION = path.resolve(FOLDER_DESTINATION);
  const filename = (OUTPUT_FILENAME || `${SEARCH_KEYWORDS} ${NOW}`).trim().replace(".csv", "");

  const FILE_NAME = `${FOLDER_DESTINATION}/${filename}.csv`.replace(/ /g, "_").replace(/:/g, "-");

  console.info(chalk.blue("\nOpening twitter search page...\n"));

  if (fs.existsSync(FILE_NAME)) {
    console.info(
      chalk.blue(`\nFound existing file ${FILE_NAME}, renaming to ${FILE_NAME.replace(".csv", ".old.csv")}`)
    );
    fs.renameSync(FILE_NAME, FILE_NAME.replace(".csv", ".old.csv"));
  }

  let TWEETS_NOT_FOUND_ON_LIVE_TAB = false;

  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({
    screen: { width: 1240, height: 1080 },
    storageState: {
      cookies: [
        {
          name: "auth_token",
          value: ACCESS_TOKEN,
          domain: "twitter.com",
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
    twitterSearchUrl = "https://twitter.com/search-advanced?f=live",
  }: StartCrawlTwitterParams = {}) {
    await page.goto(twitterSearchUrl);

    // check is current page url is twitter login page (have /login in the url)
    const isLoggedIn = !page.url().includes("/login");

    if (!isLoggedIn) {
      console.error("Invalid twitter auth token. Please check your auth token");
      return browser.close();
    }

    inputKeywords(page, {
      SEARCH_FROM_DATE,
      SEARCH_TO_DATE,
      SEARCH_KEYWORDS,
      MODIFIED_SEARCH_KEYWORDS,
    });

    let timeoutCount = 0;
    let additionalTweetsCount = 0;

    const allData = {
      tweets: [],
    };

    async function scrollAndSave() {
      timeoutCount = 0;

      while (allData.tweets.length < TARGET_TWEET_COUNT) {
        // Wait for the next response or 3 seconds, whichever comes first
        const response = await Promise.race([
          page.waitForResponse((response) => response.url().includes("SearchTimeline")),
          page.waitForTimeout(3000),
        ]);

        if (response) {
          const { data: responseBody } = (await response.json()) as { data: TweetResponseData };

          const tweets = responseBody.search_by_raw_query.search_timeline.timeline?.instructions?.[0]?.entries;

          if (!tweets) {
            console.error("No more tweets found, please check your search criteria and csv file result");
            return;
          }

          if (!tweets.length) {
            // found text "not found" on the page
            if (await page.getByText("No results for").count()) {
              TWEETS_NOT_FOUND_ON_LIVE_TAB = true;
              console.info("No tweets found for the search criteria");
              break;
            }
          }

          const headerRow = filteredFields.join(";") + "\n";

          if (!headerWritten) {
            headerWritten = true;
            appendCsv(FILE_NAME, headerRow);
          }

          const tweetContents = tweets
            .map((tweet) => {
              const isPromotedTweet = tweet.entryId.includes("promoted");

              if (!tweet.content?.itemContent) return null;
              if (isPromotedTweet) return null;

              const result = tweet.content.itemContent.tweet_results.result;
              if (!result?.core?.user_results) return null;

              const tweetContent = result.legacy || result.tweet.legacy;
              const userContent =
                result.core.user_results.result.legacy || result.tweet.core.user_results.result.legacy;

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

          const rows = comingTweets.reduce((prev: [], current: (typeof tweetContents)[0]) => {
            const tweet = pick(current.tweet, filteredFields);

            const cleanTweetText = `"${tweet.full_text.replace(/;/g, " ").replace(/\n/g, " ")}"`;

            tweet["full_text"] = cleanTweetText;
            tweet["username"] = current.user.screen_name;
            tweet["tweet_url"] = `https://twitter.com/${current.user.screen_name}/status/${tweet.id_str}`;

            const row = Object.values(tweet).join(";");

            return [...prev, row];
          }, []);

          const csv = (rows as []).join("\n") + "\n";
          const fullPathFilename = appendCsv(FILE_NAME, csv);

          console.info(chalk.blue(`Your tweets saved to: ${fullPathFilename}`));

          // progress:
          console.info(chalk.yellow(`Total tweets saved: ${allData.tweets.length}`));
          additionalTweetsCount += comingTweets.length;

          // for every multiple of 100, wait for 5 seconds
          if (additionalTweetsCount > 100) {
            additionalTweetsCount = 0;
            console.info(chalk.gray("\n--Taking a break, waiting for 10 seconds..."));
            await page.waitForTimeout(10_000);
          } else if (additionalTweetsCount > 20) {
            await page.waitForTimeout(DELAY_EACH_TWEET_SECONDS * 1000);
          }
        } else {
          timeoutCount++;
          console.info(chalk.gray("Scrolling more..."));

          await page.evaluate(() =>
            window.scrollTo({
              behavior: "smooth",
              top: 10_000 * 9_000,
            })
          );

          await scrollAndSave(); // call the function again to resume scrolling
          break;
        }

        await page.evaluate(() =>
          window.scrollTo({
            behavior: "smooth",
            top: 10_000 * 9_000,
          })
        );
      }
    }

    await scrollAndSave();

    if (allData.tweets.length) {
      console.info(`Already got ${allData.tweets.length} tweets, done scrolling...`);
    } else {
      console.info("No tweets found for the search criteria");
    }
  }

  try {
    await startCrawlTwitter();

    if (TWEETS_NOT_FOUND_ON_LIVE_TAB && (SEARCH_FROM_DATE || SEARCH_TO_DATE)) {
      console.info('No tweets found on "Latest" tab, trying "Top" tab...');

      await startCrawlTwitter({
        twitterSearchUrl: "https://twitter.com/search-advanced",
      });
    }
  } catch (error) {
    console.error(error);
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
