import dayjs from "dayjs";
import path from "path";

export const TWITTER_SEARCH_ADVANCED_URL = {
  TOP: "https://x.com/search-advanced",
  LATEST: "https://x.com/search-advanced?f=live",
};

export const NOW = dayjs().format("DD-MM-YYYY HH-mm-ss");

export const FOLDER_DESTINATION = "./tweets-data";
export const FUlL_PATH_FOLDER_DESTINATION = path.resolve(FOLDER_DESTINATION);

export const FILTERED_FIELDS = [
  "created_at",
  "id_str",
  "full_text",
  "quote_count",
  "reply_count",
  "retweet_count",
  "favorite_count",
  "lang",
  "user_id_str",
  "conversation_id_str",
  "username",
  "tweet_url",
  "image_url",
  "location",
  "in_reply_to_screen_name",
];
