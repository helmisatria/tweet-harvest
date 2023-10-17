# Changelog

## 2.2.8 (2023-10-17)

### Changes

- Implemented a recursive call to automatically click the "Retry" button whenever it appears, assuming it is due to rate limiting. This action will be repeated until the button no longer appears and the desired tweet target is achieved. Typically, the rate limit is set at 5-15 minutes, allowing us to obtain approximately 800 tweets every 5-15 minutes.
