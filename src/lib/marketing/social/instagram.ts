// Instagram Graph API client (IgBusinessAccount via Facebook Graph API)
// Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing

import type { PlatformClient, SocialPost, PublishResult } from "./types";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export class InstagramClient implements PlatformClient {
  name = "Instagram";

  private getToken(): string | null {
    return process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || null;
  }

  private getAccountId(): string | null {
    return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || null;
  }

  isConfigured(): boolean {
    return this.getToken() !== null && this.getAccountId() !== null;
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    const token = this.getToken();
    const accountId = this.getAccountId();

    if (!token || !accountId) {
      return {
        success: false,
        error: "Instagram API not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.",
        platform: "instagram",
      };
    }

    try {
      // Step 1: Create media container
      const containerUrl = `${GRAPH_API_BASE}/${accountId}/media`;
      const containerParams: Record<string, string> = {
        caption: post.text.slice(0, 2200), // Instagram caption limit
        access_token: token,
      };

      // Image is required for IG feed posts
      if (post.image_urls && post.image_urls.length > 0) {
        containerParams.image_url = post.image_urls[0];
      } else {
        return {
          success: false,
          error: "Instagram posts require an image. Upload an image first.",
          platform: "instagram",
        };
      }

      // Carousel (multiple images) support
      if (post.image_urls.length > 1 && post.image_urls.length <= 10) {
        // For carousels, we'd need to create individual child containers first
        // For MVP: use just the first image as a single feed post
        containerParams.image_url = post.image_urls[0];
      }

      const containerRes = await fetch(containerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: Object.entries(containerParams)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&"),
      });

      const containerData = await containerRes.json();

      if (!containerRes.ok || containerData.error) {
        return {
          success: false,
          error: `Instagram container error: ${containerData.error?.message || JSON.stringify(containerData)}`,
          platform: "instagram",
        };
      }

      const containerId: string = containerData.id;

      // Step 2: Publish the container
      const publishUrl = `${GRAPH_API_BASE}/${accountId}/media_publish`;
      const publishParams = new URLSearchParams({
        creation_id: containerId,
        access_token: token,
      });

      const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: publishParams.toString(),
      });

      const publishData = await publishRes.json();

      if (!publishRes.ok || publishData.error) {
        return {
          success: false,
          error: `Instagram publish error: ${publishData.error?.message || JSON.stringify(publishData)}`,
          platform: "instagram",
        };
      }

      return {
        success: true,
        external_id: publishData.id,
        platform: "instagram",
      };
    } catch (error) {
      return {
        success: false,
        error: `Instagram publish error: ${error instanceof Error ? error.message : "unknown"}`,
        platform: "instagram",
      };
    }
  }
}
