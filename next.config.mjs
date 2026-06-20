// Errata Next.js config.
//
// Two build modes (see scope/docs/12-app-foundations.md):
//   • default        → server/edge build for Vercel; CSP nonce set per-request
//                      by middleware.ts. Strongest CSP.
//   • STATIC_EXPORT=1 → fully static artifact for self-hosting / offline.
//                      A pure static export cannot mint per-request nonces, so
//                      CSP falls back to BUILD-TIME HASHES injected by
//                      scripts/generate-csp-hashes.mjs after the export.
//
// The app code is identical in both modes; only how the CSP is delivered differs.

const isStatic = process.env.STATIC_EXPORT === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export needs unoptimized images (no image server at runtime).
  images: { unoptimized: true },
  ...(isStatic ? { output: 'export' } : {}),
  // We deliberately set NO `headers()` here for the dynamic build: the CSP is
  // produced per-request in middleware so it can carry a fresh nonce. Static
  // headers (HSTS, etc.) that don't need a nonce are added in vercel.json and
  // the generated _headers file.
};

export default nextConfig;
