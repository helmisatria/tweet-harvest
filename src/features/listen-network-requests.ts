import { Page } from "@playwright/test";
import chalk from "chalk";

export const listenNetworkRequests = async (page: Page) => {
  // Listen to network requests
  await page.route("**/*", (route) => {
    const url = route.request().url();
    // only log requests that includes SearchTimeline
    if (url.includes("SearchTimeline")) {
      console.info(chalk.blue(`\nGot some tweets, saving to file...`));
    }

    // block pictures and videos
    if (url.includes(".jpg") || url.includes(".png") || url.includes(".mp4")) {
      return route.abort();
    }

    route.continue();
  });
};
