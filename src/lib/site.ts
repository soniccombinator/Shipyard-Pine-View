/**
 * Single source of truth for the site's canonical origin + name.
 *
 * Production fallback is the APEX domain — it matches `.env` COMPANY_DOMAIN,
 * the team Quick Reference Guide, and consolidates the www/apex split that
 * currently exists between `src/lib/sample.ts` and older values (audit F1 / F9).
 *
 * IMPORTANT: `.env` currently defines `PUBLIC_SITE_URL` (no NEXT_PUBLIC_ prefix),
 * which Next.js does NOT inline into the client/build. Either rename it to
 * `NEXT_PUBLIC_SITE_URL` or add `NEXT_PUBLIC_SITE_URL=https://connectable.work`
 * to the Vercel project env. Until then this module's fallback is what ships.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://connectable.work"
).replace(/\/$/, "");

export const SITE_NAME = "ConnectAble";

/** Regenerate public/partner QR assets after changing this responder URL. */
export const PARTNER_FORM_URL = "https://forms.gle/qHUJ6irF4o8W2swR9";

/** Human sentence used as the default meta description / OG description. */
export const SITE_DESCRIPTION =
  "ConnectAble connects people with intellectual and developmental disabilities to employers who can support them, with mentors as the bridge.";
