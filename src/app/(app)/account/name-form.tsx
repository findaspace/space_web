'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { updateName } from './actions';

export function NameForm({ current }: { current: string }) {
  const router = useRouter();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  async function save() {
    setBusy(true);
    setMessage(undefined);
    const res = await updateName(name);
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: res.error });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-footnote text-ink-muted">Your name, as hosts and guests see it</span>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} className="h-12 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-4 text-body" />
          <button type="button" onClick={save} disabled={busy || name.trim() === current} className="h-12 rounded-md bg-action px-5 text-headline text-on-action disabled:opacity-50">
            {busy ? 'Saving' : 'Save'}
          </button>
        </div>
      </label>
      {message ? (
        <p role={message.ok ? 'status' : 'alert'} className={`mt-2 text-footnote ${message.ok ? 'text-ink-muted' : 'text-danger'}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
