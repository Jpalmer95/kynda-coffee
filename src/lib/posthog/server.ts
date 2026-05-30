import { PostHog } from "posthog-node";

let _posthog: PostHog | null = null;

/**
 * Server-side PostHog client for tracking events from API routes and server actions.
 * Disabled when POSTHOG_KEY is not set.
 */
export function getPostHogServer(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  if (!_posthog) {
    _posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _posthog;
}

/** Track a server-side event (order placed, subscription created, etc.) */
export function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const ph = getPostHogServer();
  if (!ph) return;
  ph.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      $set: { source: "server" },
    },
  });
}

export async function shutdownPostHog() {
  const ph = getPostHogServer();
  if (ph) await ph.shutdown();
}
