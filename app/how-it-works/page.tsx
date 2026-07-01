// Public "how it works / privacy" page. This is the trust document a person
// reads BEFORE deciding to use Errata, so it is deliberately NOT gated behind
// the safety intro and touches no storage — a pure static page with no client
// JS, no hooks, nothing that phones home. Plain, calm, honest about the edges
// (scope/docs/06-risk-register.md, /11-brand.md). Every claim here must stay
// true to the architecture; if the architecture changes, this page changes.

import Link from 'next/link';

export const metadata = {
  title: 'How Errata works',
  description: 'Everything stays on your device. No account, no servers, nothing sent about you.',
};

export default function HowItWorksPage() {
  return (
    <>
      <p className="breadcrumb">
        <Link href="/">← Errata</Link>
      </p>

      <h1>How Errata works</h1>
      <p>
        Errata helps you find what’s published about you and correct it — without anyone holding
        your data. Here’s exactly how that works, in plain terms, so you can decide whether to trust
        it.
      </p>

      <h2>Everything stays on this device</h2>
      <p>
        Errata runs entirely in your browser. There’s no account to create and nothing to sign up
        for. The record you build, the corrections you draft, and your progress are kept in this
        browser’s own storage, on this device. They’re never sent to us — because there is no “us” to
        send them to. Errata has no server that stores your data.
      </p>

      <h2>What Errata never does</h2>
      <ul>
        <li>No accounts, no login, no password.</li>
        <li>Never asks for your email address or phone number.</li>
        <li>
          No analytics, no trackers, no “engagement” metrics — not even the privacy-friendly kind.
        </li>
        <li>No third-party scripts. Nothing on the page phones home.</li>
        <li>No advertising, ever.</li>
      </ul>

      <section className="info-card" aria-labelledby="one-thing">
        <h2 id="one-thing">The one thing that leaves your browser — and where it goes</h2>
        <p>
          Errata does most of the work of a correction: it drafts the opt-out request, the letter,
          the form text. <strong>You press send.</strong> When you do, that request goes straight
          from your browser to the broker or platform you’re contacting — an email you send, a form
          you submit, text you paste. It doesn’t pass through Errata. That last keystroke is yours,
          and it’s the whole privacy guarantee: your name only ever moves when you decide to move it.
        </p>
      </section>

      <h2>Saved, or not saved — your choice</h2>
      <p>
        When you first open Errata, nothing is written to this device. You start in{' '}
        <strong>session-only mode</strong>: everything disappears when you close the tab. That’s the
        safe default for a shared, borrowed, or monitored device.
      </p>
      <p>
        On your own private device, you can choose to save your progress so it’s here when you come
        back. You can switch modes anytime in <Link href="/settings">Settings</Link>.
      </p>

      <h2>“Clear everything” is always one tap away</h2>
      <p>
        The button at the top of every screen wipes Errata’s data from this device instantly — the
        whole ledger, every draft, your settings.
      </p>
      <p>
        Being honest about its reach: it clears what Errata stored. It can’t erase your browser
        history, a backup you’ve already downloaded, or the fact that the site was visited. On a
        shared device, a private or incognito window plus session-only mode is the stronger cover.
      </p>

      <h2>What Errata can’t protect you from</h2>
      <p>We’d rather tell you the edges than oversell.</p>
      <ul>
        <li>
          Someone with access to your <strong>unlocked device</strong> can see what’s on the screen.
          Session-only mode and a private window are your defenses here.
        </li>
        <li>
          Your internet provider, and whoever hosts the site, can see that a device{' '}
          <em>visited</em> Errata — an IP address, the same as with any website. They can’t see what
          you did inside it. Running Errata offline or self-hosted removes even this.
        </li>
        <li>
          A <strong>backup you export</strong> is a copy of your data on your disk. Errata encrypts
          backups by default; keep the passphrase somewhere safe, and remember that Downloads folders
          often sync to the cloud.
        </li>
      </ul>

      <h2>You don’t have to take our word for it</h2>
      <p>
        Errata is open source. Anyone can read every line, check that it does what this page says, and
        run their own copy — offline, or on their own server, with no connection to us at all. If you
        know how, open your browser’s network tools while you use it: you’ll see it isn’t sending your
        information anywhere.
      </p>

      <h2>A note on the legal information</h2>
      <p className="optout-disclaimer">
        Where Errata explains your rights or a court process, that’s general information to help you
        get oriented — not legal advice, and laws change. For your own situation, a name-change
        legal-aid group or a law-school clinic is the right next step.
      </p>

      <section className="info-card" aria-labelledby="support">
        <h2 id="support">If you need support</h2>
        <p>You don’t have to do this alone. These are outside organizations, not part of Errata:</p>
        <ul>
          <li>
            <strong>Trans Lifeline</strong> — peer support by and for trans people. US:{' '}
            <a href="tel:+18775658860">877-565-8860</a> ·{' '}
            <a href="https://translifeline.org" target="_blank" rel="noreferrer">
              translifeline.org
            </a>
          </li>
          <li>
            <strong>Access Now Digital Security Helpline</strong> — free, confidential help for
            people facing digital threats.{' '}
            <a href="https://www.accessnow.org/help/" target="_blank" rel="noreferrer">
              accessnow.org/help
            </a>
          </li>
        </ul>
      </section>

      <p className="breadcrumb">
        <Link href="/">← Back to Errata</Link>
      </p>
    </>
  );
}
