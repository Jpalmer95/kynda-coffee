import crypto from "crypto";

const DEFAULT_APP_URL = "https://kyndacoffee.com";

export function getCanonicalAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    DEFAULT_APP_URL
  ).replace(/\/+$/, "");
}

/**
 * Sanitize a relative redirect path (`next` / `redirectTo`) to prevent open redirects.
 * Only permits same-origin relative paths starting with a single `/`.
 */
export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = "/account"
): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  // Reject control characters
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return fallback;
  }
  try {
    const base = new URL(DEFAULT_APP_URL);
    const resolved = new URL(trimmed, base);
    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Ensure a redirect URL (e.g., Stripe success_url / cancel_url) stays on the
 * canonical application origin. Accepts either a relative path or an absolute
 * URL matching the allowed origin; otherwise falls back to `fallbackPath`.
 */
export function sanitizeSameOriginUrl(
  raw: string | null | undefined,
  fallbackPath: string,
  appUrl = getCanonicalAppUrl()
): string {
  const canonical = new URL(appUrl);
  const fallback = new URL(fallbackPath, canonical).toString();
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;

  try {
    const parsed = trimmed.startsWith("/")
      ? new URL(sanitizeRedirectPath(trimmed, fallbackPath), canonical)
      : new URL(trimmed);
    if (parsed.origin !== canonical.origin) return fallback;
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

/**
 * Constant-time string comparison (length-leak resistant via SHA-256 digest).
 */
export function timingSafeStringEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || b.length === 0) return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Escape HTML special characters for safe interpolation in email templates.
 */
export function escapeHtml(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip PostgREST filter syntax characters before interpolating into `.or(...)`.
 */
export function sanitizePostgrestSearch(raw: string): string {
  return raw.replace(/[,()*%\\."']/g, "").trim().slice(0, 100);
}

/**
 * Generate a cryptographically secure gift card / voucher code using CSPRNG.
 */
export function generateSecureCode(prefix: string, length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = prefix;
  for (let i = 0; i < length; i++) {
    out += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return out;
}

const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

function isBlockedPrivateOrMetadataHost(hostname: string, allowLoopback: boolean): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(lower)) return true;

  // Always block link-local / cloud metadata ranges (169.254.0.0/16, fe80::/10)
  if (lower.startsWith("169.254.") || lower.startsWith("fe80:") || lower.startsWith("fc00:") || lower.startsWith("fd")) {
    return true;
  }

  // Loopback
  const isLoopback =
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower.startsWith("127.");
  if (isLoopback) return !allowLoopback;

  // Private RFC1918 & unspecified (0.0.0.0, 10.*, 172.16-31.*, 192.168.*)
  if (
    lower === "0.0.0.0" ||
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)
  ) {
    return true;
  }

  return false;
}

/**
 * Validate an external API base URL (e.g. VLM endpoint) against SSRF targets.
 * Blocks cloud metadata endpoints and private networks; permits loopback only
 * when `allowLoopback` is explicitly true (local provider mode).
 */
export function validateExternalApiBase(
  raw: string,
  allowLoopback = false
): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invalid API base URL." };
  }

  if (parsed.protocol !== "https:" && !(allowLoopback && parsed.protocol === "http:")) {
    return {
      ok: false,
      error: allowLoopback
        ? "API base URL must use http:// or https://."
        : "Remote API base URL must use https://.",
    };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "Credentials are not allowed in the API base URL." };
  }

  if (isBlockedPrivateOrMetadataHost(parsed.hostname, allowLoopback)) {
    return { ok: false, error: "API base host is not allowed." };
  }

  return { ok: true, url: parsed };
}
