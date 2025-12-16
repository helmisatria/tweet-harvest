# Changelog

## 2.7.1 (2025-12-16)

### Fixed

- Removed ambiguous `-to` short option from the `--to` CLI flag to prevent command-line parsing conflicts

## 2.7.0 (2025-12-15)

### Added

- **XLSX Export Support**: New `--export-format` or `-e` CLI option to export data as Excel (.xlsx) files in addition to CSV
- Interactive prompt for selecting export format (CSV or Excel) when running without CLI arguments
- ISO 8601 date format for `created_at` timestamps in exported data for better tool compatibility

### Fixed

- Username and display name extraction now properly uses the `core` object, ensuring correct values are returned
- Improved text preservation - removed aggressive text cleaning that was stripping emojis and special characters
- CSV escaping now handled properly by PapaParse library instead of manual character replacement

### Changed

- Updated multiple dependencies to latest versions:
  - chalk: `^4.1.2` → `^5.6.2`
  - commander: `^11.1.0` → `^14.0.2`
  - dayjs: `^1.11.10` → `^1.11.19`
  - dotenv: `^16.4.1` → `^16.6.1`
  - papaparse: `^5.4.1` → `^5.5.3`
  - yargs: `^17.7.2` → `^18.0.0`
  - znv: `^0.3.2` → `^0.5.0`
  - zod: `^3.22.4` → `^3.25.76`
  - TypeScript: `^5.3.3` → `^5.9.3`
  - @swc/core: `^1.3.106` → `^1.15.5`
  - tsup: `^8.0.1` → `^8.5.1`
- Pinned @playwright/test to `1.41.1` (removed caret)
- Enhanced type definitions for `User` object with optional fields and `core` object
- Refactored data appending logic for better code organization
- Updated pnpm-lock.yaml to lockfile version 9.0

### Removed

- Removed `pkg` from devDependencies (no longer needed)

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
