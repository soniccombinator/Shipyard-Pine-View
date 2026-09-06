/**
 * Single source of truth for the site's canonical origin + name.
 *
 * Production fallback is the WWW domain. Vercel's project env already sets
 * `NEXT_PUBLIC_SITE_URL=https://www.connectable.work` (confirmed live: the
 * apex `connectable.work` 308-redirects to `www` there, so `www` is the only
 * host that actually serves 200s -- it's the real canonical, not the apex).
 * This fallback only matters when that env var is absent (e.g. some preview
 * deploys), so it's kept in sync with production truth rather than the bare
 * apex (audit F1 / F9).
 *
 * `.env` in this repo defines `PUBLIC_SITE_URL` (no NEXT_PUBLIC_ prefix),
 * which Next.js does NOT inline into the client/build -- harmless as long as
 * the Vercel project env sets the prefixed name directly, which it does.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.connectable.work"
).replace(/\/$/, "");

export const SITE_NAME = "ConnectAble";

/** Human sentence used as the default meta description / OG description. */
export const SITE_DESCRIPTION =
  "ConnectAble connects people with intellectual and developmental disabilities to employers who can support them, with mentors as the bridge.";
