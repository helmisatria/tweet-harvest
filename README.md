# Tweet Harvest (Twitter Crawler)

Tweet Harvest is a command-line tool that uses Playwright to scrape tweets from Twitter search results based on specified keywords and date range. The scraped tweets are saved in a CSV file.

**Note: This script is for educational purposes only. Twitter prohibits unauthenticated users from performing search or advanced search. To use this script, you need to have a valid Twitter account and obtain an Access Token, which can be obtained by logging into Twitter in your browser and extracting the `auth_token` cookie.**

## How to Use

To use Tweet Harvest, follow these simple steps:
1. Install Node.js (LTS) on your computer.
2. Open your terminal or command prompt.
3. Type `npx tweet-harvest@latest` and press Enter.
4. Follow the prompts to provide the data you want to search for on Twitter, such as keywords, dates, and other parameters.

That’s it! Tweet Harvest will open a Chromium browser instance and navigate to Twitter's search page. It will then enter your search parameters and scrape the resulting tweets. The tweets will be saved in a CSV file in a directory named tweets-data in the current working directory.

Note: You will need a Twitter auth token to use this tool. When prompted, enter your Twitter auth token to authenticate your search.
