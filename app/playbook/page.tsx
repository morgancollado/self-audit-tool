'use client';

// Phase 2 — Consolidated deadname-removal playbook. A single guided path that
// cross-links the four pillars in the order that works best — Discover what's out
// there, remove it from brokers, harden your platforms, then tackle the permanent
// records — and reflects your own local progress at each step. Read-only over the
// audit state; it sends and stores nothing of its own. Gated behind the safety
// intro like the rest of Phase 2.

import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { summarizePlaybook } from '@/lib/remediate/progress';

export default function PlaybookPage() {
  const { ready, preferences, state } = useStorage();

  if (!ready) return <p>Loading…</p>;

  if (!preferences.safetyIntroAcknowledged) {
    return (
      <>
        <p className="breadcrumb">
          <Link href="/">← Errata</Link>
        </p>
        <SafetyIntro />
      </>
    );
  }

  const s = summarizePlaybook(state);

  const stages = [
    {
      key: 'discover',
      href: '/discover',
      title: 'Discover what’s out there',
      blurb:
        'Search brokers, search engines, and platforms the way someone looking for you would — for your current name and your former name. Build a private findings list.',
      status:
        s.findings > 0
          ? `${s.findings} finding${s.findings === 1 ? '' : 's'}${s.deadnameFindings > 0 ? ` · ${s.deadnameFindings} expose your former name` : ''}`
          : 'Not started — find your exposure first.',
      done: s.findings > 0,
    },
    {
      key: 'brokers',
      href: '/remediate',
      title: 'Remove yourself from data brokers',
      blurb:
        'For each broker, Errata prepares a removal request on this device — you decide which name the listing is under and whether to include your other name, then send it yourself.',
      status:
        s.byPillar.optout > 0
          ? `${s.byPillar.optout} request${s.byPillar.optout === 1 ? '' : 's'} tracked`
          : 'Prepare opt-out requests for where you were found.',
      done: s.byPillar.optout > 0,
    },
    {
      key: 'platforms',
      href: '/harden',
      title: 'Harden your platforms',
      blurb:
        'Update your accounts to your current name and lock down who can see what — Google, Instagram, X, LinkedIn, TikTok, Reddit. Each leads with removing your former name.',
      status:
        s.byPillar.platform > 0
          ? `${s.byPillar.platform} platform${s.byPillar.platform === 1 ? '' : 's'} hardened`
          : 'Clean up the accounts that still carry your former name.',
      done: s.byPillar.platform > 0,
    },
    {
      key: 'records',
      href: '/records',
      title: 'Tackle public records & name change',
      blurb:
        'The most permanent sources: the indexed court order, the name-change petition’s publication (and sealed-petition routes), web archives, and search caches.',
      status:
        s.byPillar.deadname > 0
          ? `${s.byPillar.deadname} former-name removal${s.byPillar.deadname === 1 ? '' : 's'} tracked`
          : 'Address the records that outlast everything else.',
      done: s.byPillar.deadname > 0,
    },
  ];

  const acted = s.totalRemediations;

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">← Errata</Link>
      </p>
      <h1>Your deadname-removal playbook</h1>
      <p>
        The whole path in one place, in the order that tends to work best. Do it at your own pace —
        every step stays on this device, and nothing is sent unless you send it.
      </p>

      <StorageModeToggle />

      <section className="playbook-summary" aria-label="Your progress so far">
        <p>
          <strong>{s.findings}</strong> finding{s.findings === 1 ? '' : 's'}
          {s.deadnameFindings > 0 && <> · {s.deadnameFindings} expose your former name</>} ·{' '}
          <strong>{acted}</strong> action{acted === 1 ? '' : 's'} tracked
          {acted > 0 && <> ({s.byState.confirmed} confirmed)</>}
        </p>
      </section>

      <ol className="playbook">
        {stages.map((stage, i) => (
          <li key={stage.key} className={`playbook-stage${stage.done ? ' playbook-done' : ''}`}>
            <div className="playbook-stage-head">
              <span className="playbook-num" aria-hidden="true">
                {i + 1}
              </span>
              <h2>{stage.title}</h2>
              {stage.done && <span className="badge state-confirmed">started</span>}
            </div>
            <p className="playbook-blurb">{stage.blurb}</p>
            <p className="playbook-status">{stage.status}</p>
            <p>
              <Link className="cta" href={stage.href}>
                {stage.done ? 'Continue' : 'Start'} →
              </Link>
            </p>
          </li>
        ))}
      </ol>

      <p className="discover-next">
        Working over several sittings? <Link href="/settings">Export an encrypted backup →</Link> so
        you can pick up where you left off, even if this browser clears its storage.
      </p>

      <p className="optout-disclaimer">
        Errata is information, not legal advice. Rights and removal processes vary by state and change
        over time — verify before you rely on anything here.
      </p>
    </>
  );
}
