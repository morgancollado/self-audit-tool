'use client';

// React wiring for the storage shell. Owns the StorageManager, exposes mode +
// preferences + the panic-delete, and loads the audit state once on mount.
// Fails safe: until storage initializes (or if durable storage is unavailable)
// the app behaves as ephemeral and the panic button still works.

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuditState, Finding, Jurisdiction, Remediation, Preferences, StorageMode, DEFAULT_PREFERENCES } from '../model/types';
import { NewFindingInput, newFinding, NewRemediationInput, newRemediation, today } from '../model/factory';
import { StorageManager, memoryBackends } from './manager';
import { createDefaultStorage, requestPersistentStorage } from './browser';

interface StorageContextValue {
  ready: boolean;
  durable: boolean;
  mode: StorageMode;
  preferences: Preferences;
  state: AuditState | null;
  setMode: (mode: StorageMode, opts?: { wipeExisting?: boolean }) => Promise<void>;
  savePreferences: (next: Preferences) => Promise<void>;
  acknowledgeSafetyIntro: () => Promise<void>;
  /** Set the user's jurisdiction (state). Drives state-aware rights surfacing. */
  setJurisdiction: (jurisdiction: Jurisdiction) => Promise<void>;
  // Findings ledger (Phase 1)
  addFinding: (input: NewFindingInput) => Promise<Finding>;
  updateFinding: (id: string, patch: Partial<Finding>) => Promise<void>;
  removeFinding: (id: string) => Promise<void>;
  // Remediation tracker (Phase 2)
  addRemediation: (input: NewRemediationInput) => Promise<Remediation>;
  updateRemediation: (id: string, patch: Partial<Remediation>) => Promise<void>;
  removeRemediation: (id: string) => Promise<void>;
  // Resumable discovery progress
  setStepDone: (stepId: string, done: boolean) => Promise<void>;
  /** PANIC: wipe everything and reload to a neutral screen. */
  panic: () => Promise<void>;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [manager, setManager] = useState<StorageManager>(() =>
    StorageManager.create(memoryBackends(), 'ephemeral'),
  );
  const [ready, setReady] = useState(false);
  const [durable, setDurable] = useState(false);
  const [mode, setModeState] = useState<StorageMode>('ephemeral');
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [state, setState] = useState<AuditState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { manager: mgr, durable: dur, preferences: prefs } = await createDefaultStorage();
        if (cancelled) return;
        setManager(mgr);
        setDurable(dur);
        setModeState(mgr.mode);
        setPreferences(prefs);
        if (mgr.mode === 'persistent') {
          // Best-effort against silent eviction (R18) — deliberately NOT awaited,
          // so a slow or blocked persist() can never wedge the app on "Loading…".
          void requestPersistentStorage();
          try {
            setState((await mgr.audit.load()) ?? null);
          } catch {
            // A corrupted or newer-than-supported stored doc must not brick the
            // app; degrade to an empty state instead of an endless "Loading…".
            setState(null);
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback(
    async (next: StorageMode, opts?: { wipeExisting?: boolean }) => {
      await manager.setMode(next, opts);
      setModeState(manager.mode);
      setPreferences(await manager.loadPreferences());
      if (next === 'persistent') {
        // The user just chose to save on this device — the appropriate moment to
        // ask the browser to keep the data from being silently evicted (R18).
        void requestPersistentStorage();
        try {
          setState((await manager.audit.load()) ?? null);
        } catch {
          setState(null);
        }
      } else {
        setState(null);
      }
    },
    [manager],
  );

  const savePreferences = useCallback(
    async (next: Preferences) => {
      await manager.savePreferences(next);
      setPreferences(next);
    },
    [manager],
  );

  const setJurisdiction = useCallback(
    async (jurisdiction: Jurisdiction) => {
      const next = { ...(await manager.loadPreferences()), jurisdiction };
      await manager.savePreferences(next);
      setPreferences(next);
      // Keep an existing audit doc in sync, but don't force-create one — picking a
      // state shouldn't write persisted state before the user does anything else.
      const existing = await manager.audit.load();
      if (existing) {
        const updated = await manager.audit.update((d) => {
          d.jurisdiction = jurisdiction;
        });
        setState(updated);
      }
    },
    [manager],
  );

  const acknowledgeSafetyIntro = useCallback(async () => {
    const next = { ...(await manager.loadPreferences()), safetyIntroAcknowledged: true };
    await manager.savePreferences(next);
    setPreferences(next);
  }, [manager]);

  // Ensure the audit doc exists (lazy init on first mutation), then mutate.
  const mutate = useCallback(
    async (fn: (draft: AuditState) => void): Promise<AuditState> => {
      const prefs = await manager.loadPreferences();
      await manager.audit.init(prefs.jurisdiction ?? { country: 'us' });
      const next = await manager.audit.update(fn);
      setState(next);
      return next;
    },
    [manager],
  );

  const addFinding = useCallback(
    async (input: NewFindingInput): Promise<Finding> => {
      const finding = newFinding(input);
      await mutate((d) => {
        d.findings.unshift(finding);
      });
      return finding;
    },
    [mutate],
  );

  const updateFinding = useCallback(
    async (id: string, patch: Partial<Finding>) => {
      await mutate((d) => {
        const f = d.findings.find((x) => x.id === id);
        if (f) Object.assign(f, patch);
      });
    },
    [mutate],
  );

  const removeFinding = useCallback(
    async (id: string) => {
      await mutate((d) => {
        d.findings = d.findings.filter((x) => x.id !== id);
      });
    },
    [mutate],
  );

  const addRemediation = useCallback(
    async (input: NewRemediationInput): Promise<Remediation> => {
      let result: Remediation = newRemediation(input);
      await mutate((d) => {
        // Dedupe by (pillar, refId): the same broker/platform action shouldn't
        // accrete duplicate tracker rows if the user re-mounts the page and clicks
        // "track it" again. Update the existing row in place instead.
        const existing = input.refId
          ? d.remediations.find((r) => r.pillar === input.pillar && r.refId === input.refId)
          : undefined;
        if (existing) {
          existing.action = input.action;
          existing.state = input.state ?? existing.state;
          if (input.findingId) existing.findingId = input.findingId;
          existing.updatedAt = today();
          result = existing;
        } else {
          d.remediations.unshift(result);
        }
      });
      return result;
    },
    [mutate],
  );

  const updateRemediation = useCallback(
    async (id: string, patch: Partial<Remediation>) => {
      await mutate((d) => {
        const r = d.remediations.find((x) => x.id === id);
        if (r) {
          Object.assign(r, patch);
          r.updatedAt = today();
        }
      });
    },
    [mutate],
  );

  const removeRemediation = useCallback(
    async (id: string) => {
      await mutate((d) => {
        d.remediations = d.remediations.filter((x) => x.id !== id);
      });
    },
    [mutate],
  );

  const setStepDone = useCallback(
    async (stepId: string, done: boolean) => {
      await mutate((d) => {
        const set = new Set(d.progress.discoverCompletedSteps);
        if (done) set.add(stepId);
        else set.delete(stepId);
        d.progress.discoverCompletedSteps = [...set];
      });
    },
    [mutate],
  );

  const panic = useCallback(async () => {
    try {
      await manager.wipeAll();
    } finally {
      // Always hard-reload to a neutral screen, even if a wipe step rejected —
      // the panic button must never appear to do nothing.
      if (typeof window !== 'undefined') window.location.replace('/');
    }
  }, [manager]);

  return (
    <StorageContext.Provider
      value={{
        ready,
        durable,
        mode,
        preferences,
        state,
        setMode,
        savePreferences,
        acknowledgeSafetyIntro,
        setJurisdiction,
        addFinding,
        updateFinding,
        removeFinding,
        addRemediation,
        updateRemediation,
        removeRemediation,
        setStepDone,
        panic,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used within <StorageProvider>');
  return ctx;
}
