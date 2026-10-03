'use client';

import { useRef, useState } from 'react';

import { Icon } from '../ui/icon';
import { ShareIcon } from '../ui/icons';

export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  async function share() {
    const link = window.location.href;
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title, text, url: link }); return; }
      catch (error) { if (error instanceof Error && error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setUrl(link); dialog.current?.showModal(); }
  }
  return <>
    <button type="button" onClick={share} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-subheadline font-semibold active:bg-sunk"><ShareIcon className="size-4" /><span aria-live="polite">{copied ? 'Link copied' : 'Share'}</span></button>
    <dialog ref={dialog} className="sheet-dialog" aria-labelledby="share-title"><div className="flex items-center justify-between"><h2 id="share-title" className="text-title-2">Share this space</h2><button type="button" aria-label="Close share dialog" onClick={() => dialog.current?.close()} className="flex size-11 items-center justify-center"><Icon name="close" /></button></div><p className="mt-4 text-subheadline text-ink-muted">Select and copy this link to send it to someone.</p><label className="mt-4 block"><span className="sr-only">Listing link</span><input readOnly value={url} onFocus={(e) => e.target.select()} className="field-input" /></label></dialog>
  </>;
}
