import { Resend } from "resend";

/**
 * Lazy Resend client. Module-level `new Resend("")` crashes the production
 * build's page-data collection when RESEND_API_KEY isn't present in the build
 * environment (Resend throws "Missing API key" at construction). A Proxy
 * defers construction to first actual use, where send-time code already
 * handles failures gracefully.
 */
let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured.");
    client = new Resend(key);
  }
  return client;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return (getClient() as unknown as Record<PropertyKey, unknown>)[prop];
  },
});
