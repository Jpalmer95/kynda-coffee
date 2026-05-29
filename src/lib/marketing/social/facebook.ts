// Facebook Pages API client (Graph API v21)
// Docs: https://developers.facebook.com/docs/pages-api/posts

import type { PlatformClient, SocialPost, PublishResult } from "./types";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export class FacebookClient implements PlatformClient {
  name = "Facebook";

  private getPageToken(): string | null {
    return process.env.FACEBOOK_PAGE_ACCESS_TOKEN || null;
  }

  private getPageId(): string | null {
    return process.env.FACEBOOK_PAGE_ID || null;
  }

  isConfigured(): boolean {
    return this.getPageToken() !== null && this.getPageId() !== null;
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    const pageToken = this.getPageToken();
    const pageId = this.getPageId();

    if (!pageToken || !pageId) {
      return {
        success: false,
        error: "Facebook API not configured. Set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID.",
        platform: "facebook",
      };
    }

    try {
      const postUrl = `${GRAPH_API_BASE}/${pageId}/feed`;

      // Build form data for the post
      const params: Record<string, string> = {
        message: post.text,
        access_token: pageToken,
      };

      // If scheduling, use scheduled_publish_time (Unix timestamp)
      if (post.scheduled_at) {
        const scheduledTime = Math.floor(new Date(post.scheduled_at).getTime() / 1000);
        params.scheduled_publish_time = scheduledTime.toString();
        params.published = "false";
      }

      // Add image if provided
      if (post.image_urls && post.image_urls.length > 0) {
        params.link = post.image_urls[0]; // Facebook accepts a link to the image
      }

      const response = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&"),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          error: `Facebook API error: ${data.error?.message || JSON.stringify(data)}`,
          platform: "facebook",
        };
      }

      return {
        success: true,
        external_id: data.id,
        platform: "facebook",
      };
    } catch (error) {
      return {
        success: false,
        error: `Facebook publish error: ${error instanceof Error ? error.message : "unknown"}`,
        platform: "facebook",
      };
    }
  }
}
