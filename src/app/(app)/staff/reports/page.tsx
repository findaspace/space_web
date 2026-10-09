import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { serverApi } from '@/lib/api/server';
import { unwrap } from '@/lib/api/client';
import { ReportQueue } from './report-queue';

export const metadata: Metadata = { title: 'Listing reports', robots: { index: false } };
export default async function ReportsPage() {
  const user = await requireUser('/staff/reports');
  if (!user.roles.some((role) => role === 'admin' || role === 'support')) notFound();
  const page = await unwrap((await serverApi()).GET('/v1/admin/reports'));
  return <main id="main-content" className="page-shell py-10"><p className="eyebrow text-ink-muted">Staff workspace</p><h1 className="section-title mt-3">Listing reports</h1><p className="mt-3 max-w-2xl text-subheadline text-ink-muted">Review the evidence before taking action. Resolve or dismiss each report with a review note. Select withdrawal when a reported listing should leave public search.</p><ReportQueue reports={page.reports} /></main>;
}
