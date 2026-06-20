'use client';

// React wiring for the storage shell. Owns the StorageManager, exposes mode +
// preferences + the panic-delete, and loads the audit state once on mount.
// Fails safe: until storage initializes (or if durable storage is unavailable)
// the app behaves as ephemeral and the panic button still works.

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuditState, Finding, Preferences, StorageMode, DEFAULT_PREFERENCES } from '../model/types';
import { NewFindingInput, newFinding } from '../model/factory';
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
  // Findings ledger (Phase 1)
  addFinding: (input: NewFindingInput) => Promise<Finding>;
  updateFinding: (id: string, patch: Partial<Finding>) => Promise<void>;
  removeFinding: (id: string) => Promise<void>;
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
      const { manager: mgr, durable: dur, preferences: prefs } = await createDefaultStorage();
      if (cancelled) return;
      setManager(mgr);
      setDurable(dur);
      setModeState(mgr.mode);
      setPreferences(prefs);
      if (mgr.mode === 'persistent') {
        await requestPersistentStorage(); // best-effort against silent eviction (R18)
        setState((await mgr.audit.load()) ?? null);
      }
      setReady(true);
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
      setState(next === 'persistent' ? (await manager.audit.load()) ?? null : null);
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
    await manager.wipeAll();
    // Hard reload to a neutral screen; nothing should survive.
    if (typeof window !== 'undefined') window.location.replace('/');
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
        addFinding,
        updateFinding,
        removeFinding,
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
