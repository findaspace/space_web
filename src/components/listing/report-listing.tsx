'use client';

import Link from 'next/link';
import { useState } from 'react';
import { reportListing } from '@/app/(app)/trust/actions';
import { Modal } from '@/components/ui/modal';

export function ReportListing({ spaceId, slug, signedIn }: { spaceId: string; slug: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('suspected_scam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="mt-4 min-h-11 text-subheadline underline underline-offset-4">Report this listing</button>
    {open && <Modal titleId="report-title" onClose={() => setOpen(false)}>
      <h2 id="report-title" className="text-title-2">Something doesn’t look right?</h2>
      <p className="mt-3 text-subheadline text-ink-muted">Tell Findaspace what happened. Your report is not shown to the person listing the space. Reporting does not automatically remove a listing.</p>
      {!signedIn ? <Link href={`/login?next=${encodeURIComponent(`/s/${slug}`)}`} className="primary-button mt-5">Sign in to report</Link> : done ? <p role="status" className="mt-5">Your report is saved for review. Thank you for flagging it.</p> : <form className="mt-5 space-y-4" onSubmit={async (event) => {
        event.preventDefault(); if (busy) return; setBusy(true); setError('');
        try { const result = await reportListing(spaceId, reason, details); if (result.ok) setDone(true); else setError(result.error); }
        finally { setBusy(false); }
      }}>
        <label className="block text-subheadline">Reason<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-12 w-full rounded-md border border-line bg-surface px-3"><option value="suspected_scam">Suspected scam</option><option value="unavailable">Space is no longer available</option><option value="incorrect_details">Incorrect photos, price or details</option><option value="abuse">Abusive or inappropriate content</option><option value="other">Something else</option></select></label>
        <label className="block text-subheadline">What should we know? <span className="text-ink-muted">(optional)</span><textarea maxLength={2000} rows={4} value={details} onChange={(event) => setDetails(event.target.value)} className="mt-2 w-full rounded-md border border-line p-3" /></label>
        <p className="text-footnote text-ink-muted">Leave out passwords, payment credentials and identity documents.</p>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <button disabled={busy} className="primary-button w-full">{busy ? 'Saving…' : 'Submit report'}</button>
      </form>}
      <button type="button" onClick={() => setOpen(false)} className="secondary-button mt-3 w-full">Close</button>
    </Modal>}
  </>;
}
