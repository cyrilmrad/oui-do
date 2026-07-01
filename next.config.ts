import type { NextConfig } from "next";

/**
 * Derive the Supabase origin (auth + storage) so the CSP can allow-list exactly
 * that host for connect-src / img-src. Falls back gracefully if the env var is
 * missing at build time (the report-only CSP simply omits the specific origin).
 */
function supabaseOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

const sb = supabaseOrigin();

/**
 * Report-only Content-Security-Policy. It is intentionally NOT enforced yet:
 * the app relies on inline styles (Tailwind, framer-motion) and Next.js inline
 * bootstrap scripts, so flipping to enforce without staging would break the UI.
 * Ship report-only first, wire up a report endpoint, then switch the header name
 * to `Content-Security-Policy` once violations are clean.
 */
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Couples can point hero/gallery images at arbitrary hosts, so images stay broad.
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src 'self' ${sb} https://*.supabase.co wss://*.supabase.co`.trim(),
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
