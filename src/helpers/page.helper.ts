import { Page } from "@playwright/test";
import chalk from "chalk";

export const scrollUp = async (page: Page): Promise<void> => {
  await page.evaluate(() =>
    window.scrollTo({
      behavior: "smooth",
      top: 0,
    })
  );
};

export const scrollDown = async (page: Page): Promise<void> => {
  await page.evaluate(() =>
    // scroll to the bottom of the page
    window.scrollTo({
      behavior: "smooth",
      top: document.body.scrollHeight,
    })
  );

  // delete element that have a that has deep child data-testid="tweetPhoto"
  await page.evaluate(() => document.querySelectorAll("a div[data-testid='tweetPhoto']").forEach((el) => el.remove()));

  // delete element that have <a></a> tag that has deep child div[aria-label="Image"]
  await page.evaluate(() => document.querySelectorAll("a div[aria-label='Image']").forEach((el) => el.remove()));

  // delete element from page based on tag: data-testid="tweetPhoto"
  await page.evaluate(() => document.querySelectorAll("div[data-testid='tweetPhoto']").forEach((el) => el.remove()));
};

export const logError = (message: string): void => {
  const appVersion = require("../../package.json").version;
  const messageWithVersion = `${chalk.gray(`[v${appVersion}]`)} ${message}`;
  console.error(messageWithVersion);
};
