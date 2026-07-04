'use client';

// Phase 2 — Consolidated deadname-removal playbook. A single guided path that
// cross-links the four pillars in the order that works best — Discover what's out
// there, remove it from brokers, harden your platforms, then tackle the permanent
// records — and reflects your own local progress at each step. Read-only over the
// audit state; it sends and stores nothing of its own. Gated behind the safety
// intro like the rest of Phase 2.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useStorage } from '@/lib/storage/StorageProvider';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { MarginNote } from '@/components/MarginNote';
import { summarizePlaybook } from '@/lib/remediate/progress';

export default function PlaybookPage() {
  const t = useTranslations('playbook');
  const tc = useTranslations('common');
  const { ready, preferences, state } = useStorage();

  if (!ready) return <p>{tc('loading')}</p>;

  if (!preferences.safetyIntroAcknowledged) {
    return (
      <>
        <p className="breadcrumb">
          <Link href="/">{tc('backToErrata')}</Link>
        </p>
        <SafetyIntro />
      </>
    );
  }

  const s = summarizePlaybook(state);

  const withDeadname = (findings: number, deadname: number) =>
    deadname > 0
      ? `${t('findingsCount', { count: findings })} · ${t('deadnameCount', { count: deadname })}`
      : t('findingsCount', { count: findings });

  const stages = [
    {
      key: 'discover',
      href: '/discover',
      title: t('stageDiscoverTitle'),
      blurb: t('stageDiscoverBlurb'),
      status: s.findings > 0 ? withDeadname(s.findings, s.deadnameFindings) : t('stageDiscoverNone'),
      done: s.findings > 0,
    },
    {
      key: 'brokers',
      href: '/remediate',
      title: t('stageBrokersTitle'),
      blurb: t('stageBrokersBlurb'),
      status:
        // Counted per broker SITE (one tracker row each) — /remediate counts
        // grouped targets, so it says "sites" here to keep the two numbers from
        // reading as a contradiction.
        s.byPillar.optout > 0 ? t('stageBrokersTracked', { count: s.byPillar.optout }) : t('stageBrokersNone'),
      done: s.byPillar.optout > 0,
    },
    {
      key: 'platforms',
      href: '/harden',
      title: t('stagePlatformsTitle'),
      blurb: t('stagePlatformsBlurb'),
      status:
        s.byPillar.platform > 0
          ? t('stagePlatformsTracked', { count: s.byPillar.platform })
          : t('stagePlatformsNone'),
      done: s.byPillar.platform > 0,
    },
    {
      key: 'records',
      href: '/records',
      title: t('stageRecordsTitle'),
      blurb: t('stageRecordsBlurb'),
      status:
        s.byPillar.deadname > 0
          ? t('stageRecordsTracked', { count: s.byPillar.deadname })
          : t('stageRecordsNone'),
      done: s.byPillar.deadname > 0,
    },
  ];

  const acted = s.totalRemediations;

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">{tc('backToErrata')}</Link>
      </p>
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>

      <StorageModeToggle />

      <MarginNote>{t('marginNote')}</MarginNote>

      <section className="playbook-summary" aria-label={t('summaryAria')}>
        <p>
          {t.rich('summaryFindings', {
            count: s.findings,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
          {s.deadnameFindings > 0 && <> · {t('deadnameCount', { count: s.deadnameFindings })}</>} ·{' '}
          {t.rich('summaryActions', {
            count: acted,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
          {acted > 0 && <> {t('confirmedCount', { count: s.byState.confirmed })}</>}
        </p>
        {/* The margin note above says this too, but margin notes are decoration
            (aria-hidden, gone below 46rem) — the fact must also live in the
            accessible flow (the MarginNote duplication contract). */}
        <p className="name-inputs-note">{t('deviceOnly')}</p>
      </section>

      <ol className="playbook">
        {stages.map((stage, i) => (
          <li key={stage.key} className={`playbook-stage${stage.done ? ' playbook-done' : ''}`}>
            <div className="playbook-stage-head">
              <span className="playbook-num" aria-hidden="true">
                {i + 1}
              </span>
              <h2>{stage.title}</h2>
              {stage.done && <span className="stamp state-confirmed">{t('started')}</span>}
            </div>
            <p className="playbook-blurb">{stage.blurb}</p>
            <p className="playbook-status">{stage.status}</p>
            <p>
              <Link className="cta" href={stage.href}>
                {stage.done ? t('continueCta') : t('startCta')}
              </Link>
            </p>
          </li>
        ))}
      </ol>

      <p className="discover-next">
        {t.rich('backupNext', {
          link: (chunks) => <Link href="/settings">{chunks}</Link>,
        })}
      </p>

      <p className="optout-disclaimer">{t('disclaimer')}</p>
    </>
  );
}
