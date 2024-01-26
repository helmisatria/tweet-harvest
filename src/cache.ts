export enum CACHE_KEYS {
  GOT_TWEETS = "got_tweets",
}

type CacheKeys = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

export const cache = new Map<CacheKeys, boolean>([[CACHE_KEYS.GOT_TWEETS, false]]);
