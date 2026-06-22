// Type definitions for multi-platform social media posting

export type Platform = "instagram" | "twitter" | "facebook" | "tiktok" | "bluesky";

export type SocialPostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed";

export type SocialPostSource = "manual" | "agent" | "content_drop" | "special" | "newsletter";

export interface SocialPost {
  id: string;
  platform: Platform;
  text: string;
  image_urls?: string[];
  scheduled_at?: string; // ISO timestamp
  published_at?: string; // ISO timestamp
  external_id?: string; // platform's post ID
  status: SocialPostStatus;
  source?: SocialPostSource;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  special_id?: string;
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
