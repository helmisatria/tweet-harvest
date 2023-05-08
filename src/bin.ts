#!/usr/bin/env node
import { crawl } from "./crawl";
import { execSync } from "child_process";
import prompts from "prompts";
import chalk from "chalk";
import yargs from "yargs";

async function run() {
  console.log(chalk.bold("\nWelcome to the Twitter Crawler 🕷️\n"));
  console.log(
    "This script uses Chromium Browser to crawl data from Twitter with *your* Twitter auth token."
  );
  console.log("Please enter your Twitter auth token when prompted.\n");
  console.log(
    "Note: Keep your access token secret! Don't share it with anyone else."
  );
  console.log("Note: This script only runs on your local device.\n");

  const questions: prompts.PromptObject[] = [
    {
      type: "password",
      name: "auth_token",
      message: `What's your Twitter auth token?`,
      validate: (value) => {
        if (value.length < 1) {
          return "Please enter your Twitter auth token";
        } else if (value.length < 30) {
          return "Please enter a valid Twitter auth token";
        }

        return true;
      },
    },
  ];

  const argv: any = yargs
    .usage("Usage: $0 [options]")
    .options({
      from: {
        alias: "f",
        describe: "From date (DD-MM-YYYY)",
        type: "string",
      },
      to: {
        alias: "t",
        describe: "To date (DD-MM-YYYY)",
        type: "string",
      },
      search_keyword: {
        alias: "s",
        describe: "Search keyword",
        type: "string",
      },
      limit: {
        alias: "l",
        describe: "Limit number of tweets to crawl",
        type: "number",
      },
      delay: {
        alias: "d",
        describe: "Delay between each tweet (in seconds)",
        type: "number",
        default: 3,
      },
      debug: {},
    })
    .help()
    .alias("help", "h").argv;

  if (!argv.search_keyword) {
    questions.push({
      type: "text",
      name: "search_keyword",
      message: "What's the search keyword?",
      validate: (value) => {
        if (value.length < 1) {
          return "Please enter a search keyword";
        }
        return true;
      },
    });
  }

  if (!argv.limit) {
    questions.push({
      type: "number",
      name: "target_tweet_count",
      message: "How many tweets do you want to crawl?",
      validate: (value) => {
        if (value < 1) {
          return "Please enter a number greater than 0";
        }
        return true;
      },
    });
  }

  const answers = await prompts(questions, {
    onCancel: () => {
      console.info("Exiting...");
      process.exit(0);
    },
  });

  if (!argv.search_keyword) {
    argv.search_keyword = answers.search_keyword;
  }

  if (!argv.limit) {
    argv.limit = answers.target_tweet_count;
  }

  try {
    // Run `npx playwright install` to install the Playwright dependencies
    const output = execSync("npx playwright --version").toString();
    execSync("npm i @playwright/test", { stdio: "inherit" });
    execSync("npx playwright install chromium", { stdio: "inherit" });
    if (!output.includes("Version")) {
      console.log(
        "Installing required playwright browser dependencies... Please wait, this will take a while"
      );
    }

    // Call the `crawl` function with the access token
    crawl({
      ACCESS_TOKEN: answers.auth_token,
      SEARCH_KEYWORDS: argv.search_keyword,
      SEARCH_FROM_DATE: argv.from,
      SEARCH_TO_DATE: argv.to,
      TARGET_TWEET_COUNT: argv.limit,
      DELAY_EACH_TWEET_SECONDS: argv.delay_each_tweet,
    });
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}

run();
