/** Public origin for absolute OG/Twitter URLs (no trailing slash). */
export const SITE = {
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "https://taskmark.dev"
  ).replace(/\/$/, ""),
} as const
