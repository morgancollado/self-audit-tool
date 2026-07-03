'use client';

// M0 landing — the "errata sheet" register (scope/docs/11-brand.md): a louder,
// editorial front page that appears nowhere else in the app. It still carries the
// first-run safety intro, the storage-mode control, and the jump links — restyled
// and re-arranged, never removed. Deniable by design: nothing on screen names the
// tool's purpose.

import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';

export default function HomePage() {
  const { ready, preferences } = useStorage();

  if (!ready) {
    return <p>Loading…</p>;
  }

  return (
    <div className="landing">
      <div className="landing-inner">
        <section className="hero" aria-labelledby="hero-head">
          <h1
            className="hero-head"
            id="hero-head"
            aria-label="The record says the old entry — corrected to your name."
          >
            <span aria-hidden="true">The record says </span>
            <span className="strike-wrap" aria-hidden="true">
              <span className="strike-new">
                your name
                <span className="strike-caret">‸</span>
              </span>
              <span className="strike-old">
                the old entry
                <span className="strike-rule" />
              </span>
            </span>
            <span aria-hidden="true">.</span>
          </h1>

          <p className="hero-support">
            You are not scrubbing a secret. You are correcting a publishing error — with the
            authority of the person the record is about. Errata drafts every correction; you press
            send.
          </p>

          <div className="hero-actions">
            <Link className="btn-primary" href="/playbook">
              Begin the correction →
            </Link>
            <Link className="btn-secondary" href="/how-it-works">
              Read how it works first
            </Link>
          </div>
        </section>

        <SafetyIntro />

        {preferences.safetyIntroAcknowledged && (
          <nav className="landing-jump" aria-label="Jump to a step">
            <p className="landing-jump-lead">You’re set up. Jump straight to a step:</p>
            <ul>
              <li>
                <Link href="/discover">Discover what’s out there →</Link>
              </li>
              <li>
                Already know where you’re listed?{' '}
                <Link href="/remediate">Go straight to removal requests →</Link>
              </li>
              <li>
                Want to clean up your accounts?{' '}
                <Link href="/harden">Harden platforms &amp; remove your former name →</Link>
              </li>
              <li>
                Deadname in court records or archives?{' '}
                <Link href="/records">Tackle public records &amp; name change →</Link>
              </li>
              <li>
                <Link href="/settings">Settings — storage &amp; encrypted backup →</Link>
              </li>
            </ul>
            <StorageModeToggle />
          </nav>
        )}
      </div>

      <section className="drop-plate" aria-labelledby="drop-head">
        <div className="landing-inner drop-inner">
          <div className="drop-text">
            <p className="drop-kicker">THE HERO PATH · CALIFORNIA RESIDENTS</p>
            <h2 id="drop-head">File one correction for all.</h2>
            <p className="drop-body">
              The Delete Act lets you order every registered data broker to delete your record in a
              single request. Errata walks you through it in about fifteen minutes.
            </p>
          </div>
          <Link className="btn-cream" href="/remediate">
            Start the DROP request →
          </Link>
        </div>
      </section>

      <div className="landing-inner">
        <ol className="footnotes">
          <li>
            <span className="footnote-num" aria-hidden="true">
              1
            </span>
            Every search and draft is prepared in this tab; Errata has no server to send it to.
          </li>
          <li>
            <span className="footnote-num" aria-hidden="true">
              2
            </span>
            “Clear the desk” wipes local data instantly. It is always one click away, on every
            screen.
          </li>
        </ol>
      </div>
    </div>
  );
}
