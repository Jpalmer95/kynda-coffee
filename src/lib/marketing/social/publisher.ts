// Publisher service — orchestrates platform clients to publish social posts
// Handles: single-post publish, batch publish-due (for cron), platform status check

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { TwitterClient } from "./twitter";
import { FacebookClient } from "./facebook";
import { InstagramClient } from "./instagram";
import type { PlatformClient, SocialPost, PublishResult, Platform } from "./types";

// ─── Platform client registry ────────────────────────────────────────────────
const clients: Record<string, PlatformClient> = {
  twitter: new TwitterClient(),
  facebook: new FacebookClient(),
  instagram: new InstagramClient(),
};

export function getPlatformClient(platform: string): PlatformClient | null {
  return clients[platform] || null;
}

export function getPlatforms() {
  return Object.entries(clients).map(([key, client]) => ({
    key,
    name: client.name,
    configured: client.isConfigured(),
  }));
}

// ─── Publish a single post ───────────────────────────────────────────────────
export async function publishPost(post: SocialPost): Promise<PublishResult> {
  const client = clients[post.platform];
  if (!client) {
    return {
      success: false,
      error: `No client for platform: ${post.platform}`,
      platform: post.platform,
    };
  }

  if (!client.isConfigured()) {
    return {
      success: false,
      error: `${client.name} is not configured. Add API credentials to environment variables.`,
      platform: post.platform,
    };
  }

  return client.publish(post);
}

// ─── Publish a post from the database (by ID) ───────────────────────────────
export async function publishPostById(postId: string): Promise<PublishResult> {
  const supabase = getSupabaseAdmin();

  const { data: post, error } = await supabase
    .from("social_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error || !post) {
    return {
      success: false,
      error: `Post not found: ${postId}`,
      platform: "twitter" as Platform, // required field; actual platform unknown since lookup failed
    };
  }

  const result = await publishPost(post as unknown as SocialPost);

  // Update the post status in the database
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (result.success) {
    updateData.status = "published";
    updateData.published_at = new Date().toISOString();
    updateData.external_id = result.external_id;
    updateData.error_message = null;
  } else {
    updateData.status = "failed";
    updateData.error_message = result.error;
  }

  await supabase.from("social_posts").update(updateData).eq("id", postId);

  return result;
}

// ─── Publish all posts that are due (scheduled_at <= now, status = scheduled) ─
export async function publishDuePosts(): Promise<{
  processed: number;
  published: number;
  failed: number;
  results: Array<{ post_id: string; platform: string; success: boolean; error?: string }>;
}> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Fetch all posts that are scheduled and past their publish time
  const { data: duePostRows, error } = await supabase
    .from("social_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (error || !duePostRows) {
    return { processed: 0, published: 0, failed: 0, results: [] };
  }

  const results: Array<{ post_id: string; platform: string; success: boolean; error?: string }> = [];
  let published = 0;
  let failed = 0;

  for (const row of duePostRows) {
    const post = row as unknown as SocialPost;
    const result = await publishPost(post);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (result.success) {
      updateData.status = "published";
      updateData.published_at = new Date().toISOString();
      updateData.external_id = result.external_id;
      updateData.error_message = null;
      published++;
    } else {
      updateData.status = "failed";
      updateData.error_message = result.error;
      failed++;
    }

    await supabase.from("social_posts").update(updateData).eq("id", post.id);

    results.push({
      post_id: post.id,
      platform: post.platform,
      success: result.success,
      error: result.error,
    });
  }

  return {
    processed: duePostRows.length,
    published,
    failed,
    results,
  };
}

// ─── Create / save a social post ─────────────────────────────────────────────
export async function createSocialPost(input: {
  platform: Platform;
  text: string;
  image_urls?: string[];
  scheduled_at?: string;
  status?: "draft" | "scheduled";
  created_by?: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseAdmin();

  const status = input.status || (input.scheduled_at ? "scheduled" : "draft");

  const { data, error } = await supabase
    .from("social_posts")
    .insert({
      platform: input.platform,
      text: input.text,
      image_urls: input.image_urls || [],
      scheduled_at: input.scheduled_at || null,
      status,
      created_by: input.created_by || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: data.id };
}

// ─── List posts with filters ─────────────────────────────────────────────────
export async function listSocialPosts(filters: {
  status?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): Promise<{ posts: SocialPost[]; total: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { status, platform, limit = 50, offset = 0 } = filters;

  let query = supabase
    .from("social_posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (platform) query = query.eq("platform", platform);

  const { data, error, count } = await query;

  if (error) {
    return { posts: [], total: 0, error: error.message };
  }

  return {
    posts: (data || []) as unknown as SocialPost[],
    total: count || 0,
  };
}
