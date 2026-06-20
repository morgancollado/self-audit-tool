'use client';

// First-run safety / shared-device intro. Shown before first use; explains
// shared-device risk and offers ephemeral mode up front. Dismissible and
// re-findable. Calm, no fear-mongering (scope/docs/03, /11).

import { useStorage } from '@/lib/storage/StorageProvider';

export function SafetyIntro() {
  const { preferences, durable, mode, setMode, acknowledgeSafetyIntro } = useStorage();

  if (preferences.safetyIntroAcknowledged) return null;

  return (
    <section className="safety-intro" aria-labelledby="safety-intro-title">
      <h2 id="safety-intro-title">Before you start</h2>
      <p>
        Errata keeps everything on this device — no account, no servers, nothing sent about you.
        That also means anyone who can use this device could see your progress.
      </p>
      <ul>
        <li>
          On a <strong>shared or monitored device</strong>, use <strong>session-only mode</strong>:
          nothing is saved, and it all disappears when you close the tab.
        </li>
        <li>
          <strong>Clear everything</strong> is always in the top corner. It wipes Errata from this
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
        {durable && mode === 'persistent' && (
          <button type="button" onClick={() => void setMode('ephemeral')}>
            Use session-only mode
          </button>
        )}
        {durable && mode === 'ephemeral' && (
          <p className="safety-intro-note">Session-only mode is on — nothing will be saved.</p>
        )}
        <button type="button" className="safety-intro-primary" onClick={() => void acknowledgeSafetyIntro()}>
          I understand — continue
        </button>
      </div>
    </section>
  );
}
