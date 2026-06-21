// Per-request CSP nonce for the DYNAMIC (Vercel/edge) deployment.
//
// This middleware is the *only* server-side code Errata runs, and it is a
// stateless header-setter: it mints a random nonce, attaches the CSP, and
// forwards the request. It reads no request body, stores nothing, logs nothing,
// and never touches user data. It sees the request IP exactly as any host's
// access log already does (scope/docs/06-risk-register.md R9) — it is NOT the
// "backend exception" (that remains only the optional breach proxy).
//
// In the STATIC_EXPORT build this file is not used; CSP comes from build-time
// hashes (scripts/generate-csp-hashes.mjs).

import { NextRequest, NextResponse } from 'next/server';
import { buildCsp, generateNonce } from './lib/security/csp';

export function middleware(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    proxyOrigin: process.env.NEXT_PUBLIC_HIBP_PROXY_URL || null,
    contentCdnOrigin: process.env.NEXT_PUBLIC_CONTENT_CDN_URL || null,
  });

  // Pass the nonce to the app via a request header so the root layout can read
  // it (next/headers). Next.js also auto-applies a nonce found in the response
  // CSP to its own framework scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  // Non-nonce security headers (also mirrored in vercel.json/_headers for the
  // static build).
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

  return response;
}

export const config = {
  // Run on pages, not on static assets / image optimizer / favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/).*)'],
};
