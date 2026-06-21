'use client';

// Persistent <-> session-only (ephemeral) toggle. Switching to session-only
// offers to wipe anything already saved (scope/docs/04-data-model.md).

import { useStorage } from '@/lib/storage/StorageProvider';

export function StorageModeToggle() {
  const { durable, mode, setMode } = useStorage();

  if (!durable) {
    return <p className="mode-toggle-note">Session-only (this browser isn’t saving data).</p>;
  }

  if (mode === 'ephemeral') {
    return (
      <div className="mode-toggle">
        <p>Session-only mode — nothing is saved to this device.</p>
        <button type="button" onClick={() => void setMode('persistent')}>
          Save progress on this device
        </button>
      </div>
    );
  }

  return (
    <div className="mode-toggle">
      <p>Saving progress on this device.</p>
      <button
        type="button"
        onClick={() => {
          const wipe = window.confirm('Switch to session-only and delete what’s already saved on this device?');
          void setMode('ephemeral', { wipeExisting: wipe });
        }}
      >
        Switch to session-only
      </button>
    </div>
  );
}
