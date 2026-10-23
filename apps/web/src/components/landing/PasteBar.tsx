'use client';

import { Image as ImageIcon, Link2 } from 'lucide-react';
import { useEditor } from '@/lib/store';
import { editorActions } from '@/lib/lazy-actions';
import { errorMessage } from '@weshot/shared/errors';
import { normalizeUrl } from '@weshot/shared/url';
import { ErrorActions } from '../editor/ErrorActions';
import { cx } from '../ui/cx';

type Props = {
  /** `hero`: landing page bar; `compact`: mobile editor row. */
  variant?: 'hero' | 'compact';
  inputId?: string;
  caption?: string;
  className?: string;
};

/** The hero control (UI spec §2.3). Image paste and drop are handled page-wide by PageInput. */
export function PasteBar({ variant = 'hero', inputId = 'ws-paste-input', caption, className }: Props) {
  const value = useEditor((s) => s.barValue);
  const setValue = useEditor((s) => s.setBarValue);
  const phase = useEditor((s) => s.phase);
  const setPhase = useEditor((s) => s.setPhase);
  const capturing = phase.kind === 'capturing';
  const error = phase.kind === 'error' ? phase : null;
  const helpId = `${inputId}-help`;

  const submit = () => {
    if (!value.trim()) {
      document.getElementById(inputId)?.focus();
      return;
    }
    // Validate here so the error shows without waiting for the editor code to load.
    if (!normalizeUrl(value)) {
      setPhase({ kind: 'error', code: 'INVALID_URL', message: errorMessage('INVALID_URL') });
      document.getElementById(inputId)?.focus();
      return;
    }
    void editorActions().then((a) => a.submitBar(value));
  };

  return (
    <div className={cx('flex w-full flex-col items-center', className)}>
      <form
        role="search"
        aria-label="Frame a link or an image"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cx(
          'glass-bar flex w-full items-center rounded-pill transition-colors duration-150',
          variant === 'hero' ? 'max-w-[760px] gap-3 py-2 pl-[22px] pr-2' : 'gap-2 py-1.5 pl-4 pr-1.5',
          error && '!border-ws-yellow-line',
        )}
      >
        <Link2 size={22} strokeWidth={1.75} className="shrink-0 text-ws-text-2" aria-hidden="true" />
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Paste a link or an image"
          aria-label="Paste a link or an image"
          aria-describedby={helpId}
          aria-invalid={error?.code === 'INVALID_URL' ? true : undefined}
          data-paste-bar
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setPhase({ kind: 'idle' });
          }}
          className={cx(
            'min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-ws-placeholder focus-visible:outline-none',
            variant === 'hero' ? 'text-[16px] md:text-[18px]' : 'text-[16px]',
          )}
        />
        <button
          type="button"
          aria-label="Upload an image"
          onClick={() => document.getElementById('ws-image-input')?.click()}
          className="btn-secondary hidden h-12 w-12 shrink-0 items-center justify-center rounded-full md:inline-flex"
        >
          <ImageIcon size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="submit"
          disabled={capturing}
          className={cx(
            'btn-primary shrink-0 rounded-pill',
            variant === 'hero' ? 'h-[46px] px-5 text-[17px] md:h-14 md:px-7' : 'h-[46px] px-5 text-[17px]',
          )}
        >
          Frame it
        </button>
      </form>
      <div id={helpId} className="mt-3 flex min-h-[20px] flex-col items-center gap-2 px-2 text-center" aria-live="polite">
        {error ? (
          <>
            <p className="text-[14px] text-white">{error.message}</p>
            {error.code !== 'INVALID_URL' ? <ErrorActions code={error.code} className="justify-center" /> : null}
          </>
        ) : caption ? (
          <p className="text-[14px] text-ws-text-3">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}
