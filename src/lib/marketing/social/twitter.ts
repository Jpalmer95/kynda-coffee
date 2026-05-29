// Twitter/X v2 API client
// Docs: https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets

import type { PlatformClient, SocialPost, PublishResult } from "./types";

const X_API_BASE = "https://api.x.com/2";

export class TwitterClient implements PlatformClient {
  name = "Twitter/X";

  private getBearerToken(): string | null {
    return process.env.TWITTER_BEARER_TOKEN || null;
  }

  private getOAuthKeys(): { appKey: string; appSecret: string; accessToken: string; accessSecret: string } | null {
    const appKey = process.env.TWITTER_API_KEY;
    const appSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (appKey && appSecret && accessToken && accessSecret) {
      return { appKey, appSecret, accessToken, accessSecret };
    }
    return null;
  }

  isConfigured(): boolean {
    // Posting requires OAuth 1.0a user context (app key + access token)
    return this.getOAuthKeys() !== null;
  }

  /**
   * Create OAuth 1.0a signature for Twitter API
   * Uses HMAC-SHA1 with the app secret + access token secret
   */
  private async buildOAuthHeader(
    method: string,
    url: string,
    keys: NonNullable<ReturnType<typeof this.getOAuthKeys>>
  ): Promise<string> {
    const { createHmac, randomBytes } = await import("crypto");

    const oauthNonce = randomBytes(16).toString("hex");
    const oauthTimestamp = Math.floor(Date.now() / 1000).toString();

    const params: Record<string, string> = {
      oauth_consumer_key: keys.appKey,
      oauth_nonce: oauthNonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: oauthTimestamp,
      oauth_token: keys.accessToken,
      oauth_version: "1.0",
    };

    // Build signature base string
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");

    const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(keys.appSecret)}&${encodeURIComponent(keys.accessSecret)}`;

    const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

    params.oauth_signature = signature;

    const authHeader = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
      .join(", ");

    return `OAuth ${authHeader}`;
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    const keys = this.getOAuthKeys();
    if (!keys) {
      return {
        success: false,
        error: "Twitter API not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET.",
        platform: "twitter",
      };
    }

    try {
      // X v2 requires text <= 280 chars
      const text = post.text.slice(0, 280);

      // Build the tweet payload
      const tweetPayload: Record<string, unknown> = { text };

      // If we have an image, upload media first then attach
      if (post.image_urls && post.image_urls.length > 0) {
        const mediaId = await this.uploadMedia(post.image_urls[0], keys);
        if (mediaId) {
          tweetPayload.media = { media_ids: [mediaId] };
        }
      }

      // Post tweet via v2 API
      const url = `${X_API_BASE}/tweets`;
      const authHeader = await this.buildOAuthHeader("POST", url, keys);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tweetPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: `X API error: ${data.detail || data.title || JSON.stringify(data)}`,
          platform: "twitter",
        };
      }

      return {
        success: true,
        external_id: data.data?.id,
        platform: "twitter",
      };
    } catch (error) {
      return {
        success: false,
        error: `X publish error: ${error instanceof Error ? error.message : "unknown"}`,
        platform: "twitter",
      };
    }
  }

  /**
   * Upload media to Twitter (v1.1 endpoint still required for media)
   * Returns media_id_string on success, null on failure
   */
  private async uploadMedia(
    imageUrl: string,
    keys: NonNullable<ReturnType<typeof this.getOAuthKeys>>
  ): Promise<string | null> {
    try {
      // Download the image
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) return null;

      const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
      const base64 = imgBuffer.toString("base64");

      // Upload via v1.1 media endpoint
      const uploadUrl = "https://upload.x.com/1.1/media/upload.json";
      const authHeader = await this.buildOAuthHeader("POST", uploadUrl, keys);

      const formBody = `media_data=${encodeURIComponent(base64)}`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      });

      const data = await response.json();
      return data.media_id_string || null;
    } catch {
      console.warn("[twitter] Media upload failed, publishing without image");
      return null;
    }
  }
}
