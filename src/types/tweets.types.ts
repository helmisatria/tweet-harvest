interface TweetContent {
  __typename: string;
  rest_id: string;
  core: {
    user_results: {
      result: User;
    };
  };
  edit_control: {
    edit_tweet_ids: string[];
    editable_until_msecs: string;
    is_edit_eligible: boolean;
    edits_remaining: string;
  };
  edit_perspective: {
    favorited: boolean;
    retweeted: boolean;
  };
  is_translatable: boolean;
  views: {
    count: string;
    state: string;
  };
  source: string;
  legacy: {
    bookmark_count: number;
    bookmarked: boolean;
    created_at: string;
    conversation_id_str: string;
    display_text_range: number[];
    entities: {
      media: any[];
      user_mentions: any[];
      urls: any[];
      hashtags: any[];
      symbols: any[];
    };
    favorite_count: number;
    favorited: boolean;
    full_text: string;
    in_reply_to_screen_name?: string;
    in_reply_to_status_id_str?: string;
    in_reply_to_user_id_str?: string;
    is_quote_status: boolean;
    lang: string;
    quote_count: number;
    reply_count: number;
    retweet_count: number;
    retweeted: boolean;
    user_id_str: string;
    id_str: string;
  };
}

export interface User {
  __typename: string;
  id: string;
  rest_id: string;
  affiliates_highlighted_label?: any;
  has_graduated_access: boolean;
  is_blue_verified: boolean;
  profile_image_shape: string;
  legacy: {
    can_dm: boolean;
    can_media_tag: boolean;
    created_at: string;
    default_profile: boolean;
    default_profile_image: boolean;
    description: string;
    entities: {
      description: {
        urls: any[];
      };
      url: {
        urls: {
          display_url: string;
          expanded_url: string;
          url: string;
          indices: number[];
        }[];
      };
    };
    fast_followers_count: number;
    favourites_count: number;
    followers_count: number;
    friends_count: number;
    has_custom_timelines: boolean;
    is_translator: boolean;
    listed_count: number;
    location: string;
    media_count: number;
    name: string;
    normal_followers_count: number;
    pinned_tweet_ids_str: any[];
    possibly_sensitive: boolean;
    profile_banner_url: string;
    profile_image_url_https: string;
    profile_interstitial_type: string;
    screen_name: string;
    statuses_count: number;
    translator_type: string;
    url: string;
    verified: boolean;
    want_retweets: boolean;
    withheld_in_countries: any[];
  };
  professional: {
    rest_id: string;
    professional_type: string;
    category: any[];
  };
  super_follow_eligible: boolean;
}

export interface ItemContent {
  itemType: string;
  __typename: string;
  tweet_results: {
    result: TweetContent & {
      tweet?: TweetContent;
    };
  };
  tweetDisplayType: string;
  socialContext: {
    type: string;
    contextType: string;
    text: string;
    landingUrl: {
      url: string;
      urlType: string;
      urtEndpointOptions: {
        title: string;
        requestParams: {
          key: string;
          value: string;
        }[];
      };
    };
  };
}

export interface Entry {
  entryId: string;
  sortIndex: string;
  content: {
    items?: {
      entryId: string;
      item: {
        itemContent: ItemContent;
      };
    }[];
    entryType: string;
    __typename: string;
    itemContent: ItemContent;
    feedbackInfo: {
      feedbackKeys: string[];
      feedbackMetadata: string;
    };
    clientEventInfo: {
      component: string;
      element: string;
      entityToken: string;
      details: {
        timelinesDetails: {
          injectionType: string;
          controllerData: string;
        };
      };
    };
  };
}

export interface Instructions {
  type: "TimelineAddEntries";
  entries: Entry[];
}

export interface SearchTimeline {
  timeline: {
    instructions: Instructions[];
  };
}

export interface TweetResponseData {
  search_by_raw_query: {
    search_timeline: SearchTimeline;
  };
}

export interface RootObject {
  data: TweetResponseData;
}
