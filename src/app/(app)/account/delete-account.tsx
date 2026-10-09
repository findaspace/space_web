'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteAccount } from '../trust/actions';
import { Modal } from '@/components/ui/modal';

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <section className="mt-8 border-t border-line pt-6">
    <h2 className="text-headline">Your account, your choice</h2>
    <p className="mt-2 text-footnote text-ink-muted">Remove your profile and withdraw your listings when you no longer need Findaspace.</p>
    <button type="button" onClick={() => setOpen(true)} className="mt-2 min-h-11 text-subheadline text-danger underline">Delete my account</button>
    {open && <Modal titleId="delete-title" dismissible={!busy} onClose={() => setOpen(false)}>
      <h2 id="delete-title" className="text-title-2">Delete your account?</h2>
      <p className="mt-3 text-subheadline leading-6">This removes your profile details, withdraws your listings and signs out every device. It cannot be undone. Necessary transaction and safety records are retained without your profile details. Uploaded files are queued for removal after 24 hours; cached copies may take longer to expire.</p>
      <p className="mt-3 text-footnote text-ink-muted">Complete active bookings and transfer staff access first. You must have signed in within the last 15 minutes.</p>
      <form className="mt-5" onSubmit={async (event) => {
        event.preventDefault(); if (busy) return; setBusy(true); setError('');
        try { const result = await deleteAccount(confirmation); if (result.ok) { router.replace('/?account=deleted'); router.refresh(); } else setError(result.error); }
        finally { setBusy(false); }
      }}>
        <label className="block text-subheadline">Type DELETE to confirm<input autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 min-h-12 w-full rounded-md border border-line px-3" /></label>
        {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
        <button disabled={busy || confirmation !== 'DELETE'} className="primary-button mt-5 w-full">{busy ? 'Deleting…' : 'Permanently delete account'}</button>
      </form>
      <button type="button" disabled={busy} onClick={() => setOpen(false)} className="secondary-button mt-3 w-full">Keep my account</button>
    </Modal>}
  </section>;
}
