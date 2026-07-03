'use client';

// Encrypted-by-default backup (scope/docs/04-data-model.md R14). Export writes a
// passphrase-encrypted file by default — the backup can contain the deadname and
// usually lands in a cloud-synced Downloads folder, so plaintext is an explicit,
// warned opt-out. Import detects encrypted vs plaintext, prompts for the
// passphrase, and offers replace (default) or merge. All in the browser; the file
// never leaves the device except when the user saves or opens it.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';
import { isEncryptedBackup, ImportMode } from '@/lib/storage/backup';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BackupPanel() {
  const t = useTranslations('backup');
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
      setExportErr(t('needPassphrase'));
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
      setExportMsg(encrypt ? t('exportedEncrypted') : t('exportedPlain'));
    } catch {
      setExportErr(t('exportFailed'));
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
      setImportErr(t('chooseFirst'));
      return;
    }
    try {
      await importBackup(fileText, { passphrase: fileEncrypted ? importPass : undefined, mode });
      setImportMsg(mode === 'replace' ? t('importedReplace') : t('importedMerge'));
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : t('importFailed'));
    }
  };

  return (
    <section className="backup" aria-labelledby="backup-title">
      <h2 id="backup-title">{t('title')}</h2>
      <p className="name-inputs-note">{t('intro')}</p>

      <div className="backup-block">
        <h3>{t('exportHead')}</h3>
        <p className="backup-warn" role="note">
          {t('exportWarn')}
        </p>
        <label className="optout-field">
          {t('passphrase')}
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
          {t('passphraseHint')}
        </p>
        <label className="optout-aliases">
          <input type="checkbox" checked={!encrypt} onChange={(e) => setEncrypt(!e.target.checked)} />
          {t('noPassphrase')}
          <span className="optout-aliases-warn">{t('noPassphraseWarn')}</span>
        </label>
        <div className="backup-actions">
          <button type="button" className="safety-intro-primary" onClick={() => void doExport()}>
            {t('download')}
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
        <h3>{t('importHead')}</h3>
        <label className="optout-field">
          {t('backupFile')}
          <input type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
        {fileEncrypted && (
          <label className="optout-field">
            {t('passphrase')}
            <input
              type="password"
              autoComplete="off"
              value={importPass}
              onChange={(e) => setImportPass(e.target.value)}
            />
          </label>
        )}
        <fieldset className="backup-mode">
          <legend>{t('modeLegend')}</legend>
          <label>
            <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            {t('modeReplace')}
          </label>
          <label>
            <input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            {t('modeMerge')}
          </label>
        </fieldset>
        <div className="backup-actions">
          <button type="button" onClick={() => void doImport()}>
            {t('importButton')}
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
