import { Page } from "@playwright/test";

export const scrollDown = async (page: Page): Promise<void> => {
  await page.evaluate(() =>
    window.scrollTo({
      behavior: "smooth",
      top: 10_000 * 9_000,
    })
  );

  // delete element that have a that has deep child data-testid="tweetPhoto"
  await page.evaluate(() => document.querySelectorAll("a div[data-testid='tweetPhoto']").forEach((el) => el.remove()));

  // delete element that have <a></a> tag that has deep child div[aria-label="Image"]
  await page.evaluate(() => document.querySelectorAll("a div[aria-label='Image']").forEach((el) => el.remove()));

  // delete element from page based on tag: data-testid="tweetPhoto"
  await page.evaluate(() => document.querySelectorAll("div[data-testid='tweetPhoto']").forEach((el) => el.remove()));
};
