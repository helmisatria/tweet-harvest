#!/usr/bin/env node
import { crawl } from "./crawl";
import { execSync } from "child_process";
import prompts from "prompts";

async function run() {
  const questions: prompts.PromptObject[] = [
    {
      type: "password",
      name: "access_token",
      message: `What's your Twitter access token?`,
    },
  ];

  const answers = await prompts(questions, {
    onCancel: () => {
      console.info("Exiting...");
      process.exit(0);
    },
    onSubmit: () => {
      console.info("Crawling...");
    },
  });

  try {
    // Run `npx playwright install` to install the Playwright dependencies
    const output = execSync("npx playwright -V");
    if (!output.includes("Version")) {
      console.info(
        "Installing Browser Playwright dependencies... this will take a while"
      );
      // check if playwright installed
      execSync("npx playwright install chromium");
    }

    // Call the `crawl` function with the access token
    crawl({ access_token: answers.access_token });
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}

run();
