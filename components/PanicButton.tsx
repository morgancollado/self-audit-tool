'use client';

// Panic-delete: one obvious, always-reachable control that instantly wipes all
// local state and reloads to a neutral screen. Instant and UNCONFIRMED by design
// — a "are you sure?" prompt can fail the user in the moment
// (scope/docs/04-data-model.md). Export-first lives elsewhere for non-panic
// situations.

import { useStorage } from '@/lib/storage/StorageProvider';

export function PanicButton() {
  const { panic } = useStorage();
  return (
    <button
      type="button"
      className="panic-button"
      onClick={() => void panic()}
      aria-label="Clear the desk: instantly delete all Errata data on this device and reload"
      title="Instantly delete all data on this device and reload"
    >
      Clear&nbsp;the&nbsp;desk
    </button>
  );
}
