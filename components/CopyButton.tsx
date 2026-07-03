'use client';

import { useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

export function CopyButton({
  text,
  label = 'Copy',
  variant = 'default',
}: {
  text: string;
  label?: string;
  /** 'primary' = the one emphasized action; 'quiet' = an underlined text button. */
  variant?: 'default' | 'primary' | 'quiet';
}) {
  const [status, setStatus] = useState<CopyState>('idle');

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      // Clipboard blocked (insecure context / denied permission). Don't fail
      // silently — tell the user the text is selectable so they can copy by hand.
      setStatus('failed');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const buttonLabel =
    status === 'copied' ? 'Copied ✓' : status === 'failed' ? 'Select the text to copy' : label;

  const cls =
    variant === 'primary' ? 'copy-button copy-primary'
    : variant === 'quiet' ? 'copy-button copy-quiet'
    : 'copy-button';

  return (
    <>
      <button type="button" className={cls} onClick={onClick} aria-label={buttonLabel}>
        {buttonLabel}
      </button>
      {/* Announce the result to assistive tech without depending on the label swap. */}
      <span className="visually-hidden" role="status" aria-live="polite">
        {status === 'copied'
          ? 'Copied to clipboard.'
          : status === 'failed'
            ? 'Copying is blocked here. Select the text above and copy it manually.'
            : ''}
      </span>
    </>
  );
}
