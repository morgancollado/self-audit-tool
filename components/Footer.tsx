// Site-wide footer, mounted once in the root layout so it appears on every
// screen. Deliberately small and DENIABLE (scope/docs/06-risk-register.md R3,
// /11-brand.md): it must reveal nothing about what the tool is for to a
// bystander glancing at a shared/watched device — so support resources are
// reached via a neutral "Get support" link to the how-it-works page rather than
// naming crisis orgs in text on every screen. Pure static, no client JS.

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="site-footer">
      <nav aria-label="Footer">
        <Link href="/how-it-works">How it works &amp; privacy</Link>
        <a href="https://github.com/morgancollado/self-audit-tool" target="_blank" rel="noreferrer">
          Source code
        </a>
        <Link href="/how-it-works#support">Get support</Link>
      </nav>
      <p className="site-footer-note">
        Everything stays on your device. No account, no servers, no tracking.
      </p>
    </footer>
  );
}
