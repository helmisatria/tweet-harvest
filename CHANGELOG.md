# Changelog

## 2.6.1 (2024-05-20)

### Changes

- Fix: cookie domain changes from twitter.com to x.com

## 2.6.0 (2024-03-28)

### Changes

- Fix: add install playwright browser postinstall
- Fix: use HiDPI browser
- Fix: adjust scroll height
- Fix: dynamic scroll based on page height

## 2.5.3 (2024-01-27)

### Changes

- Fix: consistency of csv headers order
- Feat: convert tweet-harvest csv to gephi format source,target

## 2.5.0 (2024-01-19)

### Changes

- Faster (lower scroll's pause time) and more large acceptable timeout so when the network is slow, the crawler can still work.
- Remove displayed image/video whenever possible to reduce amount of scrolls.
- Reduce number of unncecessary logs

## 2.4.2 (2023-11-26)

### Changes

- Add image_url to the output CSV file (if exists).
- Add location to the output CSV file (if exists).

## 2.4.1 (2023-11-26)

### Changes

- Fixed inconsistent delimiter and CSV formatting in crawl functionality.
- The delimiter has been standardized to use commas consistently throughout the CSV file.
- Ensured proper conversion of object values to strings in the crawl functionality.
- Improved CSV formatting and enhanced reliability of data extraction from Twitter data.

## 2.4.0 (2023-10-25)

### Added

- Add `SEARCH_TAB` or `--search-tab` or `--tab` option to specify the tab to search for tweets. Default is `LATEST` tab. The options are `LATEST` and `TOP`.

## 2.3.0 (2023-10-25)

### Added

- Implemented optional exponential backoff for rate limit handling. The wait time between retries will now be calculated dynamically based on the number of attempts made, resulting in fewer requests during the rate-limit window. This should help to reduce the risk of account bans. To utilize this feature, set the `ENABLE_EXPONENTIAL_BACKOFF` environment variable to true.

### Changed

- In absence of the `ENABLE_EXPONENTIAL_BACKOFF` setting or when it is set to false, the rate limit handling will default to the previous flat 1-minute retry timeout.

### Notes

- While the new optional feature greatly minimizes the risk of account bans due to rate limit exceptions, it might not be suitable for all use cases due to increased wait times between the retries. Consider your scenario before enabling this feature.
- Kudos to @alvinmatias69 for the contribution!

## 2.2.8 (2023-10-17)

### Changes

- Implemented a recursive call to automatically click the "Retry" button whenever it appears, assuming it is due to rate limiting. This action will be repeated until the button no longer appears and the desired tweet target is achieved. Typically, the rate limit is set at 5-15 minutes, allowing us to obtain approximately 800 tweets every 5-15 minutes.
