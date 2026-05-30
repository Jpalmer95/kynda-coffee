import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Don't send PII
  sendDefaultPii: false,

  // Filter noisy server errors
  beforeSend(event) {
    // Skip Supabase connection errors in CI (dummy env vars)
    if (event.exception?.values?.[0]?.value?.includes("supabaseUrl is required")) {
      return null;
    }
    return event;
  },
});
