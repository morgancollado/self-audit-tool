'use client';

// First-run safety / shared-device intro. Shown before first use. The app starts
// in session-only mode and writes NOTHING to this device (not even the named
// database) until the user makes an explicit choice here — so a first-time
// visitor on a shared or monitored device leaves no trace just by opening it.
// Calm, no fear-mongering (scope/docs/03, /11).

import { useStorage } from '@/lib/storage/StorageProvider';

export function SafetyIntro() {
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
      <h2 id="safety-intro-title">Before you start</h2>
      <p>
        Errata keeps everything on this device — no account, no servers, nothing sent about you.
        Right now nothing is being saved: you’re in <strong>session-only mode</strong>, and it all
        disappears when you close the tab.
      </p>
      <ul>
        <li>
          On a <strong>shared or monitored device</strong>, stay in session-only mode — nothing is
          written to this device, so there’s nothing for anyone else to find.
        </li>
        <li>
          On your <strong>own private device</strong>, you can save your progress so it’s here when
          you come back.
        </li>
        <li>
          <strong>Clear the desk</strong> is always in the top corner. It wipes Errata from this
          device instantly. (It can’t erase your browser history or anything you’ve downloaded.)
        </li>
        <li>You set the pace. You can stop and come back any time.</li>
      </ul>

      {!durable && (
        <p className="safety-intro-note">
          This browser isn’t saving data anyway (private mode or storage is blocked), so you’re
          already in session-only mode.
        </p>
      )}

      <div className="safety-intro-actions">
        <button type="button" className="safety-intro-primary" onClick={continueSessionOnly}>
          Continue — don’t save (session-only)
        </button>
        {durable && (
          <button type="button" onClick={() => void saveOnThisDevice()}>
            Save my progress on this device
          </button>
        )}
      </div>
    </section>
  );
}
