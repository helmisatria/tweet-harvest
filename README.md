# Tweet Harvest (Twitter Crawler)

This script uses Playwright to scrape tweets from Twitter search results based on specified keywords and date range. The scraped tweets are saved in a CSV file. 

**Note: This script is for educational purposes only. Twitter prohibits unauthenticated users from performing search or advanced search. To use this script, you need to have a valid Twitter account and obtain an Access Token, which can be obtained by logging into Twitter in your browser and extracting the `auth_token` cookie.**

## Prerequisites

Before running the script, make sure to install the required dependencies by running `pnpm install`.

Also, create a `.env` file in the root directory of the project and add your Twitter Access Token. You can obtain the `ACCESS_TOKEN` value from the Twitter cookie named `auth_token`. You can do this by logging into Twitter in your browser, opening the developer console, navigating to the Application tab, and finding the cookie in the Storage section. 

Alternatively, you can use a tool like [EditThisCookie](http://www.editthiscookie.com/) to export the cookie as a JSON file, and then read the value of `auth_token` from the JSON file.

## Usage

1. Modify the constants `SEARCH_KEYWORDS`, `SEARCH_FROM_DATE`, `SEARCH_TO_DATE`, and `SEARCH_LIMIT` to specify your search criteria.
2. Run the script using the command `node index.js`.
3. The script will launch a browser window and start scrolling through the search results, scraping tweets and saving them to a CSV file.
4. The CSV file will be named based on the search keywords and the current date and time and located in `output` folder.

Note: The script is set to scrape a maximum of 500 tweets. You can modify this limit by changing the value of the `SEARCH_LIMIT` constant.
