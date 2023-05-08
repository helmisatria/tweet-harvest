import { ElementHandle, chromium } from "playwright-chromium";
import * as fs from "fs";
import dayjs from "dayjs";
import { pick } from "lodash";
import { config } from "dotenv";
import chalk from "chalk";
import path from "path";

config();

const NOW = dayjs().format("DD-MM-YYYY HH-mm-ss");

function appendCsv(pathStr: string, contents: any, cb?) {
  const dirName = path.dirname(pathStr);
  const fileName = path.resolve(pathStr);

  fs.mkdirSync(dirName, { recursive: true });
  fs.appendFileSync(fileName, contents, cb);

  return fileName;
}

const filteredFields = [
  "created_at",
  "id",
  "id_str",
  "full_text",
  "quote_count",
  "reply_count",
  "retweet_count",
  "favorite_count",
  "geo",
  "lang",
  "user_id_str",
  "conversation_id",
  "conversation_id_str",
  "media_url_https",
  "media_type",
  "username",
];

type StartCrawlTwitterParams = {
  twitterSearchUrl?: string;
};

async function retry(fn, retriesLeft = 5, interval = 2000) {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft) {
      console.warn(`Retrying in ${interval / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, interval));
      return retry(fn, retriesLeft - 1, interval);
    } else {
      console.error("Max retries exceeded.");
      throw error;
    }
  }
}

export async function crawl({
  ACCESS_TOKEN,
  SEARCH_KEYWORDS,
  SEARCH_FROM_DATE,
  SEARCH_TO_DATE,
  TARGET_TWEET_COUNT,
  // default delay each tweet activity: 3 seconds
  DELAY_EACH_TWEET_SECONDS = 3,
  DEBUG_MODE,
}: {
  ACCESS_TOKEN: string;
  SEARCH_KEYWORDS?: string;
  SEARCH_FROM_DATE?: string;
  SEARCH_TO_DATE?: string;
  TARGET_TWEET_COUNT?: number;
  DELAY_EACH_TWEET_SECONDS?: number;
  DEBUG_MODE?: boolean;
}) {
  let MODIFIED_SEARCH_KEYWORDS = SEARCH_KEYWORDS;

  const CURRENT_PACKAGE_VERSION = require("../package.json").version;

  // change spaces to _
  const FOLDER_DESTINATION = "./tweets-data";
  const FUlL_PATH_FOLDER_DESTINATION = path.resolve(FOLDER_DESTINATION);
  const FILE_NAME = `${FOLDER_DESTINATION}/${SEARCH_KEYWORDS} ${NOW}.csv`
    .replace(/ /g, "_")
    .replace(/:/g, "-");

  console.info(chalk.blue("\nOpening twitter search page...\n"));

  let TWEETS_NOT_FOUND_ON_LIVE_TAB = false;

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    screen: {
      width: 1920,
      height: 1080,
    },
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

  // Listen to network requests
  await page.route("**/*", (route) => {
    const url = route.request().url();
    // only log requests that includes adaptive.json
    if (url.includes("adaptive.json")) {
      console.info(chalk.blue(`\nGot some tweets, saving to file...`));
    }

    route.continue();
  });

  async function startCrawlTwitter({
    twitterSearchUrl = "https://twitter.com/search-advanced?f=live",
  }: StartCrawlTwitterParams = {}) {
    await page.goto(twitterSearchUrl, {
      waitUntil: "networkidle",
    });

    // check is current page url is twitter login page (have /login in the url)
    const isLoggedIn = !page.url().includes("/login");

    if (!isLoggedIn) {
      console.error("Invalid twitter auth token. Please check your auth token");
      return browser.close();
    }

    // // wait until it shown: h2 Advanced search
    // await page.waitForSelector("h2", { state: "visible" });

    // wait until it shown: input[name="allOfTheseWords"]
    await page.waitForSelector('input[name="allOfTheseWords"]', {
      state: "visible",
    });

    await page.click('input[name="allOfTheseWords"]');

    if (SEARCH_FROM_DATE) {
      const [day, month, year] = SEARCH_FROM_DATE.split(" ")[0].split("-");
      MODIFIED_SEARCH_KEYWORDS += ` since:${year}-${month}-${day}`;
    }

    if (SEARCH_TO_DATE) {
      const [day, month, year] = SEARCH_TO_DATE.split(" ")[0].split("-");
      MODIFIED_SEARCH_KEYWORDS += ` until:${year}-${month}-${day}`;
    }

    console.info(
      chalk.yellow(`\nFilling in keywords: ${MODIFIED_SEARCH_KEYWORDS}\n`)
    );

    await page.fill('input[name="allOfTheseWords"]', MODIFIED_SEARCH_KEYWORDS);

    // Press Enter
    await page.press('input[name="allOfTheseWords"]', "Enter");

    let timeoutCount = 0;
    let lastScrollId;
    let additionalTweetsCount = 0;

    const allData = {
      tweets: [],
      users: [],
    };

    async function scrollAndSave() {
      timeoutCount = 0;

      while (allData.tweets.length < TARGET_TWEET_COUNT) {
        // Wait for the next response or 10 seconds, whichever comes first
        const response = await Promise.race([
          page.waitForResponse((response) =>
            response.url().includes("adaptive.json")
          ),
          page.waitForTimeout(3000),
        ]);

        if (response) {
          const responseBody = await response.json();

          const tweets = responseBody.globalObjects.tweets;
          const users = responseBody.globalObjects.users;

          if (!Object.keys(tweets).length) {
            // found text "not found" on the page
            if (await page.getByText("No results for").count()) {
              TWEETS_NOT_FOUND_ON_LIVE_TAB = true;
              console.info("No tweets found for the search criteria");
              break;
            }
          }

          // console.info("tweet posted at -->", tweetCreatedAt);

          lastScrollId =
            responseBody?.timeline?.instructions?.[1]?.replaceEntry?.entry
              ?.content?.operation?.cursor?.value;

          const headerRow = filteredFields.join(";") + "\n";

          if (allData.tweets.length === 0) {
            appendCsv(FILE_NAME, headerRow);
          }

          // add tweets and users to allData
          allData.tweets.push(...Object.values(tweets));
          allData.users.push(...Object.values(users));

          // write tweets to CSV file
          const comingTweets = Object.values(tweets);

          if (!fs.existsSync(FOLDER_DESTINATION)) {
            const dir = fs.mkdirSync(FOLDER_DESTINATION, { recursive: true });
            const dirFullPath = path.resolve(dir);

            console.info(chalk.green(`Created new directory: ${dirFullPath}`));
          }

          const rows = comingTweets.reduce((prev: [], current: any) => {
            const tweet = pick(current, filteredFields);
            tweet["full_text"] = `"${tweet["full_text"].replace(
              /\n/g,
              "\\n"
            )}"`;
            tweet["media_url_https"] =
              `"${current?.entities?.media?.[0]?.media_url_https ?? ""}"` || "";
            tweet["media_type"] = `"${
              current?.entities?.media?.[0]?.type ?? ""
            }"`;
            tweet["username"] = allData.users.find(
              (user) => user.id_str === tweet.user_id_str
            )?.screen_name;

            const row = Object.values(tweet).join(";");

            return [...prev, row];
          }, []);

          const csv = (rows as []).join("\n") + "\n";
          const fullPathFilename = appendCsv(FILE_NAME, csv);

          console.info(chalk.blue(`Your tweets saved to: ${fullPathFilename}`));

          // progress:
          console.info(
            chalk.yellow(`Total tweets saved: ${allData.tweets.length}`)
          );
          additionalTweetsCount += comingTweets.length;

          // for every multiple of 100, wait for 5 seconds
          if (additionalTweetsCount > 100) {
            additionalTweetsCount = 0;
            console.info(
              chalk.gray("\n--Taking a break, waiting for 10 seconds...")
            );
            await page.waitForTimeout(10_000);
          } else if (additionalTweetsCount > 20) {
            // for every multiple of 20, wait for 3 seconds
            // console.info("Taking a break, waiting for 3 seconds...");
            await page.waitForTimeout(DELAY_EACH_TWEET_SECONDS * 1000);
          }
        } else {
          timeoutCount++;
          if (timeoutCount === 1) {
            console.info(chalk.gray("No additional tweet, scrolling more..."));
          } else {
            console.info(
              chalk.gray("Still no additional tweet, scrolling more...")
            );
          }

          const findLastTweet = async () => {
            let lastTweet: ElementHandle<SVGElement | HTMLElement>;

            while (!lastTweet) {
              lastTweet = await page.$(
                "article[data-testid='tweet']:last-child div[data-testid='tweetText'] span"
              );

              if (!lastTweet) {
                await page.evaluate(() => {
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                });

                await page.waitForTimeout(1_000);
              }

              await page.evaluate(() => {
                const lastTweet = document.querySelector(
                  "article[data-testid='tweet']:last-child"
                );

                lastTweet?.scrollIntoView({ behavior: "smooth" });
              });

              await page.waitForTimeout(1_000);
            }

            return lastTweet;
          };

          const clickLastTweet = async () => {
            const lastTweet = await findLastTweet();
            await lastTweet.click({ timeout: 1_000 }).catch(async () => {
              await page.evaluate(() => {
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              });

              await clickLastTweet();
            });
          };

          const lastTweet = await page.$(
            "article[data-testid='tweet']:last-child div[data-testid='tweetText'] span"
          );

          if (!lastTweet) {
            console.info(chalk.gray("Still looking for the tweets..."));
            await findLastTweet();
            await page.waitForTimeout(1_000);
          }

          await clickLastTweet();

          await page.goBack();
          await page.waitForURL("https://twitter.com/search**");

          // scroll to the last tweet
          await page.evaluate(() => {
            const lastTweet = document.querySelector(
              "article[data-testid='tweet']:last-child"
            );

            console.log("lastTweet", lastTweet?.textContent);
          });

          await scrollAndSave(); // call the function again to resume scrolling
          break;
        }

        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight)
        );
      }
    }

    await scrollAndSave();

    if (allData.tweets.length) {
      console.info(
        `Already got ${allData.tweets.length} tweets, done scrolling...`
      );
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

    const errorFilename =
      FUlL_PATH_FOLDER_DESTINATION +
      `/Error-${NOW}.png`.replace(/ /g, "_").replace(".csv", "");

    console.info(
      chalk.yellowBright("Twitter Harvest v", CURRENT_PACKAGE_VERSION)
    );

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
