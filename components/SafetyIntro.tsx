'use client';

// First-run safety / shared-device intro. Shown before first use. The app starts
// in session-only mode and writes NOTHING to this device (not even the named
// database) until the user makes an explicit choice here — so a first-time
// visitor on a shared or monitored device leaves no trace just by opening it.
// Calm, no fear-mongering (scope/docs/03, /11).

import { useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';

const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

export function SafetyIntro() {
  const t = useTranslations('safetyIntro');
  const { preferences, durable, acknowledgeSafetyIntro, setMode } = useStorage();

  if (preferences.safetyIntroAcknowledged) return null;

  // Stay session-only (the safe default): just dismiss. Nothing is written.
  const continueSessionOnly = () => void acknowledgeSafetyIntro();

  // Opt in to saving: switch to persistent first (this is the moment we create
  // the database and request persistence), then record the acknowledgement.
  const saveOnThisDevice = async () => {
    await setMode('persistent');
    await acknowledgeSafetyIntro();
  };

  return (
    <section className="safety-intro" aria-labelledby="safety-intro-title">
      <h2 id="safety-intro-title">{t('title')}</h2>
      <p>{t.rich('intro', { strong })}</p>
      <ul>
        <li>{t.rich('li1', { strong })}</li>
        <li>{t.rich('li2', { strong })}</li>
        <li>{t.rich('li3', { strong })}</li>
        <li>{t('li4')}</li>
      </ul>

      {!durable && <p className="safety-intro-note">{t('notDurable')}</p>}

      <div className="safety-intro-actions">
        <button type="button" className="safety-intro-primary" onClick={continueSessionOnly}>
          {t('continueSessionOnly')}
        </button>
        {durable && (
          <button type="button" onClick={() => void saveOnThisDevice()}>
            {t('save')}
          </button>
        )}
      </div>
    </section>
  );
}
