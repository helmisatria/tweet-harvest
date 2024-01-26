#!/usr/bin/env node

import { Command, Option } from "commander";
const program = new Command();
import { crawl } from "./crawl";
import chalk from "chalk";
import prompts from "prompts";
import fs from "fs";
import path from "path";

const version = fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8").match(/"version": "(.*?)"/)[1];

program.name("npx tweet-harvest").version(version);

program
  .addOption(new Option("-t, --token <type>", "Twitter auth token"))
  .addOption(new Option("-f, --from <type>", "From date (DD-MM-YYYY)"))
  .addOption(new Option("-to, --to <type>", "To date (DD-MM-YYYY)"))
  .addOption(new Option("-s, --search-keyword <type>", "Search keyword"))
  .addOption(new Option("--thread <type>", "Tweet thread URL"))
  .addOption(new Option("-l, --limit <number>", "Limit number of tweets to crawl").argParser(parseInt))
  .addOption(new Option("-d, --delay <number>", "Delay between each tweet (in seconds)").default(3).argParser(parseInt))
  .addOption(new Option("-o, --output-filename <type>", "Output filename"))
  .addOption(new Option("--tab <type>", "Search tab").choices(["TOP", "LATEST"]).default("TOP"));

function showWelcomeMessage() {
  console.log(chalk.bold.green(`Tweet Harvest [v${version}]\n`));
  console.log(
    chalk.blue("Research by ") +
      chalk.bold.blue("Helmi Satria") +
      chalk.blue("\nUse it for Educational Purposes only!\n")
  );
  console.log(
    chalk.yellow(
      `This script uses Chromium Browser to crawl data from Twitter with ${chalk.bold("your Twitter auth token")}.`
    )
  );
  console.log(chalk.yellow("Please enter your Twitter auth token when prompted.\n"));
  console.log(chalk.red.bold("Note:") + " Keep your access token secret! Don't share it with anyone else.");
  console.log(chalk.red.bold("Note:") + " This script only runs on your local device.\n");
}

async function main() {
  showWelcomeMessage();

  program.parse(process.argv);
  const options = program.opts();

  let needPrompts = false;
  const questions = [];

  if (!options.token) {
    needPrompts = true;
    questions.push({
      type: "password",
      name: "token",
      message: `What's your Twitter auth token?`,
      validate: (value) => (value.length >= 30 ? true : "Please enter a valid Twitter auth token"),
    });
  }

  if (!options.searchKeyword && !options.thread) {
    needPrompts = true;
    questions.push({
      type: "text",
      name: "searchKeyword",
      message: "What's the search keyword?",
      validate: (value) => (value.length > 0 ? true : "Please enter a search keyword"),
    });
  }

  if (!options.limit) {
    needPrompts = true;
    questions.push({
      type: "number",
      name: "limit",
      message: "How many tweets do you want to crawl?",
      validate: (value) => (value > 0 ? true : "Please enter a number greater than 0"),
    });
  }

  if (needPrompts) {
    const answers = await prompts(questions, {
      onCancel: () => {
        console.info("Exiting...");
        process.exit(0);
      },
    });

    Object.assign(options, answers);
  }

  try {
    crawl({
      ACCESS_TOKEN: options.token,
      SEARCH_KEYWORDS: options.searchKeyword,
      TWEET_THREAD_URL: options.thread,
      SEARCH_FROM_DATE: options.from,
      SEARCH_TO_DATE: options.to,
      TARGET_TWEET_COUNT: options.limit,
      DELAY_EACH_TWEET_SECONDS: options.delay,
      OUTPUT_FILENAME: options.outputFilename,
      SEARCH_TAB: options.tab.toUpperCase(),
    });
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}

main();
