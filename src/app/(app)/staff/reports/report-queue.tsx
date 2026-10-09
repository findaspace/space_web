'use client';

import Link from 'next/link';
import { useState } from 'react';
import { reviewReport } from '../../trust/actions';
import type { components } from '@/lib/api/schema';

type Report = components['schemas']['ListingReport'];
export function ReportQueue({ reports }: { reports: Report[] }) {
  const [items, setItems] = useState(reports);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string>();
  return <section className="mt-8" aria-label="Open reports">
    {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
    {!items.length ? <p role="status" className="rounded-lg border border-line bg-surface p-8 text-center">No open reports.</p> : <ul className="space-y-4">{items.map((report) => <li key={report.id} className="rounded-lg border border-line bg-surface p-5">
      <Link href={`/s/${report.slug}`} prefetch={false} className="mb-3 block min-h-11 text-subheadline font-semibold underline">{report.title} — open listing</Link>
      <h2 className="text-headline capitalize">{report.reason.replaceAll('_', ' ')}</h2><p className="mt-2 whitespace-pre-wrap break-words text-subheadline">{report.details || 'No additional explanation.'}</p>
      <details className="mt-3 text-footnote text-ink-muted"><summary>Record identifiers</summary><p className="mt-2 break-all">Listing: {report.space_id}<br />Report: {report.id}</p></details>
      <form className="mt-4" onSubmit={async (event) => {
        event.preventDefault(); if (busy) return; const form = event.currentTarget; const data = new FormData(form); const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        setBusy(report.id); setError(''); try { const result = await reviewReport(report.id, submitter?.value || 'resolved', String(data.get('note') || ''), data.get('withdraw') === 'on'); if (result.ok) setItems((current) => current.filter((item) => item.id !== report.id)); else setError(result.error); } finally { setBusy(undefined); }
      }}>
        <label className="block text-footnote">Review note<textarea name="note" required maxLength={2000} rows={2} className="mt-2 w-full rounded-md border border-line p-3" /></label>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-footnote"><input type="checkbox" name="withdraw" />Withdraw the listing from public search when resolving</label>
        <div className="mt-3 flex flex-wrap gap-3"><button name="status" value="resolved" disabled={Boolean(busy)} className="primary-button">{busy === report.id ? 'Saving…' : 'Resolve'}</button><button name="status" value="dismissed" disabled={Boolean(busy)} className="secondary-button">Dismiss</button></div>
      </form>
    </li>)}</ul>}
  </section>;
}
