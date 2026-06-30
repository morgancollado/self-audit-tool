'use client';

// Encrypted-by-default backup (scope/docs/04-data-model.md R14). Export writes a
// passphrase-encrypted file by default — the backup can contain the deadname and
// usually lands in a cloud-synced Downloads folder, so plaintext is an explicit,
// warned opt-out. Import detects encrypted vs plaintext, prompts for the
// passphrase, and offers replace (default) or merge. All in the browser; the file
// never leaves the device except when the user saves or opens it.

import { useState } from 'react';
import { useStorage } from '@/lib/storage/StorageProvider';
import { isEncryptedBackup, ImportMode } from '@/lib/storage/backup';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BackupPanel() {
  const { exportBackup, importBackup } = useStorage();

  // Export state
  const [encrypt, setEncrypt] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [exportMsg, setExportMsg] = useState('');
  const [exportErr, setExportErr] = useState('');

  // Import state
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileEncrypted, setFileEncrypted] = useState(false);
  const [importPass, setImportPass] = useState('');
  const [mode, setMode] = useState<ImportMode>('replace');
  const [importMsg, setImportMsg] = useState('');
  const [importErr, setImportErr] = useState('');

  const doExport = async () => {
    setExportMsg('');
    setExportErr('');
    if (encrypt && passphrase.trim() === '') {
      setExportErr('Enter a passphrase, or choose to export without one.');
      return;
    }
    try {
      const text = await exportBackup({ passphrase: encrypt ? passphrase : undefined });
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `errata-backup-${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg(
        encrypt
          ? 'Encrypted backup downloaded. Keep the passphrase somewhere safe — without it the file can’t be opened.'
          : 'Plaintext backup downloaded. Anyone who opens this file can read your data, including your former name.',
      );
    } catch {
      setExportErr('Couldn’t create the backup. Try again.');
    }
  };

  const onFile = async (file: File | undefined) => {
    setImportMsg('');
    setImportErr('');
    if (!file) {
      setFileText(null);
      return;
    }
    const text = await file.text();
    setFileText(text);
    setFileEncrypted(isEncryptedBackup(text));
  };

  const doImport = async () => {
    setImportMsg('');
    setImportErr('');
    if (!fileText) {
      setImportErr('Choose a backup file first.');
      return;
    }
    try {
      await importBackup(fileText, { passphrase: fileEncrypted ? importPass : undefined, mode });
      setImportMsg(
        mode === 'replace'
          ? 'Backup restored — it replaced what was here.'
          : 'Backup merged into your current data.',
      );
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Couldn’t import that file.');
    }
  };

  return (
    <section className="backup" aria-labelledby="backup-title">
      <h2 id="backup-title">Backup &amp; restore</h2>
      <p className="name-inputs-note">
        Your data lives only on this device. A backup is the durable copy you control — and on some
        browsers (notably iOS Safari) local data is cleared after about a week of not visiting, so an
        occasional export is the safe way to “resume later.”
      </p>

      <div className="backup-block">
        <h3>Export</h3>
        <p className="backup-warn" role="note">
          A backup can contain your former name. Encrypting it is the default for a reason — a
          downloaded file often syncs to iCloud or Google Drive.
        </p>
        <label className="optout-field">
          Passphrase
          <input
            type="password"
            autoComplete="new-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            disabled={!encrypt}
            aria-describedby="backup-passphrase-hint"
          />
        </label>
        <p id="backup-passphrase-hint" className="name-inputs-note">
          You’ll need this exact passphrase to restore. There’s no recovery if you lose it.
        </p>
        <label className="optout-aliases">
          <input type="checkbox" checked={!encrypt} onChange={(e) => setEncrypt(!e.target.checked)} />
          Export without a passphrase
          <span className="optout-aliases-warn"> — not recommended; the file will be readable by anyone</span>
        </label>
        <div className="backup-actions">
          <button type="button" className="safety-intro-primary" onClick={() => void doExport()}>
            Download backup
          </button>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {exportMsg}
        </p>
        {exportMsg && <p className="backup-ok">{exportMsg}</p>}
        {exportErr && (
          <p className="backup-err" role="alert">
            {exportErr}
          </p>
        )}
      </div>

      <div className="backup-block">
        <h3>Import</h3>
        <label className="optout-field">
          Backup file
          <input type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
        {fileEncrypted && (
          <label className="optout-field">
            Passphrase
            <input
              type="password"
              autoComplete="off"
              value={importPass}
              onChange={(e) => setImportPass(e.target.value)}
            />
          </label>
        )}
        <fieldset className="backup-mode">
          <legend>How should it be applied?</legend>
          <label>
            <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            Replace what’s here
          </label>
          <label>
            <input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            Merge into what’s here
          </label>
        </fieldset>
        <div className="backup-actions">
          <button type="button" onClick={() => void doImport()}>
            Import backup
          </button>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {importMsg}
        </p>
        {importMsg && <p className="backup-ok">{importMsg}</p>}
        {importErr && (
          <p className="backup-err" role="alert">
            {importErr}
          </p>
        )}
      </div>
    </section>
  );
}
