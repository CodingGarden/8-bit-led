export interface ValueItem {
  name: string;
  part: string;
  value: number;
}

export interface VideoThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface VideoID {
  /**
   * `"youtube#video"`
   */
  kind: string;
  videoId: string;
}

/**
 * @see https://developers.google.com/youtube/v3/docs/search/list
 */
export interface VideoSearchResult {
  /**
   * `"youtube#searchResult"`
   */
  kind: string;
  etag: string;
  /**
   * @see https://developers.google.com/youtube/v3/docs/search#id
   */
  id: VideoID;
  snippet: {
    /**
     * Date
     */
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    title: string;
    description: string;
    /**
     * `"live"`
     */
    liveBroadcastContent: string;
    thumbnails: {
      default: VideoThumbnail;
      medium: VideoThumbnail;
      high: VideoThumbnail;
    };
  };
}

/**
 * @see https://developers.google.com/youtube/v3/docs/videos/list
 */
export interface Video {
  /**
   * `"youtube#video"`
   */
  kind: string;
  etag: string;
  /**
   * @see https://developers.google.com/youtube/v3/docs/videos#id
   */
  id: string;
  liveStreamingDetails: {
    /**
     * Date
     */
    actualStartTime: string;
    /**
     * Integer string
     */
    concurrentViewers: string;
    activeLiveChatId: string;
  };
}

/**
 * @see https://github.com/CodingGarden/live-chat-manager/blob/18a67c591e0c8fbd0333e9c15321686fc4d4dfa6/server/src/routes/index.js#L264
 */
export interface CJStream {
  snippet: {
    liveChatId: string;
  }
}

/**
 * @see https://github.com/CodingGarden/live-chat-manager/blob/18a67c591e0c8fbd0333e9c15321686fc4d4dfa6/server/src/routes/index.js#L265
 */
export type Stream = VideoSearchResult & VideoID & Video & CJStream;

/**
 * @see https://developers.google.com/youtube/v3/live/docs/liveChatMessages#authorDetails
 * @see https://github.com/CodingGarden/live-chat-manager/blob/18a67c591e0c8fbd0333e9c15321686fc4d4dfa6/server/src/routes/index.js#L76
 */
export interface Author {
  channelId: string;
  channelUrl: string;
  displayName: string;
  isChatModerator: boolean;
  isChatOwner: boolean;
  isChatSponsor: boolean;
  isVerified: boolean;
  profileImageUrl: string;
}

/**
 * @see https://github.com/CodingGarden/live-chat-manager/blob/18a67c591e0c8fbd0333e9c15321686fc4d4dfa6/server/src/routes/index.js#L117
 * @see https://github.com/CodingGarden/live-chat-manager/blob/18a67c591e0c8fbd0333e9c15321686fc4d4dfa6/server/src/routes/index.js#L157
 */
export interface Message {
  author: Author;
  id: string;
  message: string;
  platform: 'twitch' | 'youtube';
  publishedAt: string;
}

export interface CommandType {
  parts: string[];
  commandName: string;
}

export type Command = Message & CommandType;