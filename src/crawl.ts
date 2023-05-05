import { chromium } from "playwright-chromium";
import * as fs from "fs";
import dayjs from "dayjs";
import { pick } from "lodash";
import { config } from "dotenv";

config();

const SEARCH_KEYWORDS = "kucing";
const SEARCH_LIMIT = 500;

// Date format: DD-MM-YYYY
const SEARCH_FROM_DATE = "01-01-2023";
const SEARCH_TO_DATE = "02-01-2023";

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
];

export async function crawl({ access_token }: { access_token: string }) {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    storageState: {
      cookies: [
        {
          name: "auth_token",
          value: access_token,
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
      console.info("Fetching tweets...");
    }

    route.continue();
  });

  // await page.goto("https://twitter.com/search-advanced");
  console.info("Opening twitter search page...");
  await page.goto("https://twitter.com/search-advanced?f=live");
  await page.click('input[name="allOfTheseWords"]');

  console.info(`Filling in keywords: ${SEARCH_KEYWORDS}`);
  await page.fill('input[name="allOfTheseWords"]', SEARCH_KEYWORDS);

  if (SEARCH_FROM_DATE) {
    await page.click('div[aria-label="From"]');
    const selects = await page.$$('div[aria-label="From"] select');
    const monthSelect = selects[0];
    const daySelect = selects[1];
    const yearSelect = selects[2];

    const [day, month, year] = SEARCH_FROM_DATE.split("-");
    const monthName = dayjs()
      .month(parseInt(month) - 1)
      .format("MMMM");

    await monthSelect.selectOption(monthName);
    await daySelect.selectOption(Number(day).toString());
    await yearSelect.selectOption(Number(year).toString());
  }

  if (SEARCH_TO_DATE) {
    await page.click('div[aria-label="To"]');
    const selectsTo = await page.$$('div[aria-label="To"] select');

    const monthSelectTo = selectsTo[0];
    const daySelectTo = selectsTo[1];
    const yearSelectTo = selectsTo[2];

    const [day, month, year] = SEARCH_TO_DATE.split("-");
    // month is still number, not string. convert it first to month name
    const monthName = dayjs()
      .month(parseInt(month) - 1)
      .format("MMMM");

    await monthSelectTo.selectOption(monthName);
    await daySelectTo.selectOption(Number(day).toString());
    await yearSelectTo.selectOption(Number(year).toString());
  }

  // Press Enter
  await page.press('input[name="allOfTheseWords"]', "Enter");

  const now = dayjs().format("DD-MM-YYYY HH:mm:ss");
  let timeoutCount = 0;
  let lastScrollId;
  let lastTweetCreatedAt;
  let additionalTweetsCount = 0;

  const allData = {
    tweets: [],
    users: [],
  };

  async function scrollAndSave() {
    timeoutCount = 0;

    while (allData.tweets.length < SEARCH_LIMIT) {
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
            console.info("No tweets found for the search criteria");
            break;
          }
        }

        const tweetCreatedAt = Object.values(tweets)?.[0]?.["created_at"];
        if (!tweetCreatedAt) {
          console.info("No tweet created_at found");
          console.warn("tweets -->", tweets);
          return;
        }

        lastTweetCreatedAt = tweetCreatedAt;

        console.info("tweet posted at -->", tweetCreatedAt);

        lastScrollId =
          responseBody?.timeline?.instructions?.[1]?.replaceEntry?.entry
            ?.content?.operation?.cursor?.value;

        // add tweets and users to allData
        allData.tweets.push(...Object.values(tweets));
        allData.users.push(...Object.values(users));

        // write tweets to CSV file
        const comingTweets = Object.values(tweets);
        const keywords = SEARCH_KEYWORDS; // replace with actual keywords
        const filename = `./output/${keywords} ${now}.csv`;

        if (!fs.existsSync(filename)) {
          fs.mkdirSync("./output", { recursive: true });
        }

        const headerRow = filteredFields.join(";") + "\n";

        if (allData.tweets.length === 0) {
          fs.appendFileSync(filename, headerRow);
        }

        const rows = comingTweets.reduce((prev: [], current: any) => {
          const tweet = pick(current, filteredFields);
          tweet["full_text"] = `"${tweet["full_text"].replace(/\n/g, "\\n")}"`;
          tweet["media_url_https"] =
            `"${current?.entities?.media?.[0]?.media_url_https ?? ""}"` || "";
          tweet["media_type"] = `"${
            current?.entities?.media?.[0]?.type ?? ""
          }"`;

          const row = Object.values(tweet).join(";");

          return [...prev, row];
        }, []);

        const csv = (rows as []).join("\n") + "\n";
        fs.appendFileSync(filename, csv);

        // progress:
        console.info("Progress data tweets: -->", allData.tweets.length);
        additionalTweetsCount += comingTweets.length;

        // for every multiple of 100, wait for 5 seconds
        if (additionalTweetsCount > 100) {
          additionalTweetsCount = 0;
          console.info("Taking a break, waiting for 5 seconds...");
          await page.waitForTimeout(5000);
        } else if (additionalTweetsCount > 20) {
          // for every multiple of 20, wait for 2 seconds
          console.info("Taking a break, waiting for 2 seconds...");
          await page.waitForTimeout(2000);
        }
      } else {
        console.info("Timed out waiting for response");
        timeoutCount++;
        if (timeoutCount > 3) {
          console.info(
            "Timed out waiting for response too many times, clicking last tweet and going back"
          );

          const lastTweet = await page.$(
            "article[data-testid='tweet']:last-child div[data-testid='tweetText'] span"
          );

          await lastTweet.click();
          await page.goBack();
          await page.waitForURL("https://twitter.com/search**");
          await scrollAndSave(); // call the function again to resume scrolling
          break;
        }
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
  }

  await scrollAndSave();

  console.info("Done scrolling...");
}
