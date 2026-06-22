/**
 * Bluesky (AT Protocol) social media client.
 *
 * Bluesky is free, open, and has no API costs — ideal for a small business.
 * Uses the AT Protocol XRPC API (https://atproto.com/specs/xrpc).
 *
 * Setup:
 *  1. Create an app password at https://bsky.app/settings/app-passwords
 *  2. Set env vars: BLUESKY_IDENTIFIER (e.g. "kyndacoffee.bsky.social")
 *                   BLUESKY_APP_PASSWORD
 *
 * The AT Protocol uses a session token flow: we authenticate, get an access
 * JWT, and use it for post creation. Media upload uses blob ingest.
 */

import type { PlatformClient, SocialPost, PublishResult } from "./types";

const BSKY_API = "https://bsky.social/xrpc";

interface BskySession {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
}

export class BlueskyClient implements PlatformClient {
  name = "Bluesky";

  private getCreds(): { identifier: string; password: string } | null {
    const identifier = process.env.BLUESKY_IDENTIFIER;
    const password = process.env.BLUESKY_APP_PASSWORD;
    if (identifier && password) return { identifier, password };
    return null;
  }

  isConfigured(): boolean {
    return this.getCreds() !== null;
  }

  private async createSession(): Promise<BskySession> {
    const creds = this.getCreds();
    if (!creds) throw new Error("Bluesky credentials not configured");

    const res = await fetch(`${BSKY_API}/com.atproto.server.createSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: creds.identifier,
        password: creds.password,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Bluesky auth failed: ${res.status} ${err}`);
    }

    return res.json();
  }

  private async uploadBlob(
    session: BskySession,
    imageData: ArrayBuffer,
    mimeType: string
  ): Promise<{ cid: string }> {
    const res = await fetch(`${BSKY_API}/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
        "Content-Type": mimeType,
      },
      body: imageData,
    });

    if (!res.ok) throw new Error(`Bluesky blob upload failed: ${res.status}`);
    const data = await res.json();
    return { cid: data.blob.cid };
  }

  private async fetchImageBlob(url: string): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const mimeType = res.headers.get("content-type") || "image/jpeg";
      const data = await res.arrayBuffer();
      return { data, mimeType };
    } catch {
      return null;
    }
  }

  async publish(post: SocialPost): Promise<PublishResult> {
    try {
      const session = await this.createSession();

      // Build the post record (AT Protocol "post" lexicon)
      const record: Record<string, unknown> = {
        $type: "app.bsky.feed.post",
        text: post.text,
        createdAt: new Date().toISOString(),
      };

      // Handle image attachments
      if (post.image_urls && post.image_urls.length > 0) {
        const embedImages: Array<{
          image: { $type: "blob"; ref: { $cid: string }; mimeType: string; size: number };
          alt: string;
        }> = [];

        // Bluesky allows up to 4 images
        for (const url of post.image_urls.slice(0, 4)) {
          const fetched = await this.fetchImageBlob(url);
          if (!fetched) continue;
          const blob = await this.uploadBlob(session, fetched.data, fetched.mimeType);
          embedImages.push({
            image: {
              $type: "blob",
              ref: { $cid: blob.cid },
              mimeType: fetched.mimeType,
              size: fetched.data.byteLength,
            },
            alt: post.text.slice(0, 100), // Use post text as alt
          });
        }

        if (embedImages.length > 0) {
          record.embed = {
            $type: "app.bsky.embed.images",
            images: embedImages,
          };
        }
      }

      // Detect facets (URLs, mentions) — basic implementation
      const facets = this.detectFacets(post.text);
      if (facets.length > 0) {
        record.facets = facets;
      }

      // Create the post via repo.putRecord
      const rkey = Date.now().toString();
      const res = await fetch(`${BSKY_API}/com.atproto.repo.putRecord`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: session.did,
          collection: "app.bsky.feed.post",
          rkey,
          record,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return {
          success: false,
          error: `Bluesky publish failed: ${res.status} ${err}`,
          platform: "bluesky" as const,
        };
      }

      const data = await res.json();
      const uri = data.uri || `at://${session.did}/app.bsky.feed.post/${rkey}`;

      return {
        success: true,
        external_id: uri,
        platform: "bluesky" as const,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown Bluesky error",
        platform: "bluesky" as const,
      };
    }
  }

  /**
   * Detect URL and mention facets for proper Bluesky rendering.
   * Byte-offset based per AT Protocol spec.
   */
  private detectFacets(text: string): Array<{
    index: { byteStart: number; byteEnd: number };
    features: Array<Record<string, unknown>>;
  }> {
    const facets: Array<{
      index: { byteStart: number; byteEnd: number };
      features: Array<Record<string, unknown>>;
    }> = [];

    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);

    // URL facets
    const urlRegex = /https?:\/\/[^\s]+/g;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // Convert char offsets to byte offsets
      const byteStart = encoder.encode(text.slice(0, start)).length;
      const byteEnd = encoder.encode(text.slice(0, end)).length;
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#link", uri: match[0] }],
      });
    }

    // Mention facets (@handle)
    const mentionRegex = /@[a-zA-Z0-9._-]+/g;
    while ((match = mentionRegex.exec(text)) !== null) {
      const handle = match[0].slice(1); // remove @
      const start = match.index;
      const end = start + match[0].length;
      const byteStart = encoder.encode(text.slice(0, start)).length;
      const byteEnd = encoder.encode(text.slice(0, end)).length;
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#mention", did: handle }],
      });
    }

    return facets;
  }
}
