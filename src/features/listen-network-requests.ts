import { Page } from "@playwright/test";

export const listenNetworkRequests = async (page: Page) => {
  // Listen to network requests
  await page.route("**/*", (route) => {
    const url = route.request().url();
    // only log requests that includes SearchTimeline
    if (url.includes("SearchTimeline")) {
      /**
       * Got some tweets, saving to file (if any)...
       */
    }

    // block pictures and videos
    if (url.includes(".jpg") || url.includes(".png") || url.includes(".mp4") || url.includes("format=jpg")) {
      return route.abort();
    }

    route.continue();
  });
};
