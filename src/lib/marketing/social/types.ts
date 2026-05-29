// Type definitions for multi-platform social media posting

export type Platform = "instagram" | "twitter" | "facebook" | "tiktok";

export interface SocialPost {
  id: string;
  platform: Platform;
  text: string;
  image_urls?: string[];
  scheduled_at?: string; // ISO timestamp
  published_at?: string; // ISO timestamp
  external_id?: string; // platform's post ID
  status: "draft" | "scheduled" | "published" | "failed";
  error_message?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PublishResult {
  success: boolean;
  external_id?: string;
  error?: string;
  platform: Platform;
}

export interface PlatformClient {
  name: string;
  isConfigured: () => boolean;
  publish: (post: SocialPost) => Promise<PublishResult>;
}
