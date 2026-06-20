// Single source of truth for Errata's Content-Security-Policy.
//
// Used by:
//   • middleware.ts                 → dynamic build, with a per-request `nonce`
//   • scripts/generate-csp-hashes.mjs → static build, with build-time `hashes`
//
// Privacy/safety posture (see scope/docs/06-risk-register.md, 03-architecture.md):
//   • default-src 'self'           — nothing third-party by default
//   • NO report-uri / report-to    — CSP reporting would phone home; we omit it
//   • fonts/styles/scripts self    — no Google Fonts CDN, no third-party scripts
//   • connect-src is the only place external origins appear, and only for:
//       - api.pwnedpasswords.com    (client-side password k-anonymity check)
//       - an OPTIONAL self-hosted breach proxy (if configured)
//       - an OPTIONAL content CDN   (if the user opts into runtime refresh)
//
// `'strict-dynamic'` lets the trusted bootstrap (nonce- or hash-allowed) load
// the rest of the app's scripts, so we never need 'unsafe-inline' for scripts.

export interface CspOptions {
  /** Per-request nonce (dynamic/middleware build). */
  nonce?: string;
  /** sha256 base64 hashes of inline scripts (static build). */
  hashes?: string[];
  /** Optional self-hosted HIBP proxy origin, e.g. https://proxy.example.com */
  proxyOrigin?: string | null;
  /** Optional content-refresh CDN origin (opt-in feature). */
  contentCdnOrigin?: string | null;
}

const HIBP_RANGE_ORIGIN = 'https://api.pwnedpasswords.com';

function scriptSrc({ nonce, hashes }: CspOptions): string {
  const sources = ["'self'"];
  if (nonce) sources.push(`'nonce-${nonce}'`);
  if (hashes) for (const h of hashes) sources.push(`'sha256-${h}'`);
  // 'strict-dynamic' is only safe WITH a nonce (the dynamic/middleware build).
  // Under strict-dynamic, modern browsers ignore 'self' and the host-list and
  // trust only nonce/hash-matched scripts plus what they inject — so the nonce
  // carries the framework's own <script> tags.
  //
  // It must NOT be emitted for a hash-only CSP (the static export): there the
  // framework chunks are parser-inserted <script src> tags with no nonce and no
  // SRI, hashes only cover INLINE scripts, and strict-dynamic would make the
  // browser refuse every same-origin chunk — the app would never hydrate.
  // Without it, plain 'self' allows those same-origin chunks while the inline
  // hashes still pin inline scripts.
  if (nonce) sources.push("'strict-dynamic'");
  return sources.join(' ');
}

export function buildCsp(opts: CspOptions = {}): string {
  const connect = ["'self'", HIBP_RANGE_ORIGIN];
  if (opts.proxyOrigin) connect.push(opts.proxyOrigin);
  if (opts.contentCdnOrigin) connect.push(opts.contentCdnOrigin);

  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': scriptSrc(opts),
    // Styles: self-hosted CSS only. We avoid runtime-injected inline styles so
    // we don't need 'unsafe-inline'. If a dependency forces inline styles, hash
    // them rather than opening this up.
    'style-src': "'self'",
    'img-src': "'self' data:",
    'font-src': "'self'",
    'connect-src': connect.join(' '),
    // No third-party frames; nothing may frame us (clickjacking).
    'frame-src': "'none'",
    'frame-ancestors': "'none'",
    'object-src': "'none'",
    'base-uri': "'none'",
    // Allow same-origin form posts; outbound mailto:/deep-links are top-level
    // navigations and are not constrained here.
    'form-action': "'self'",
    'upgrade-insecure-requests': '',
  };

  return Object.entries(directives)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join('; ');
}

/** Generate a CSP-safe nonce (base64). Edge/Web Crypto compatible. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
