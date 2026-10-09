import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'Help and safety' };
export default function SupportPage() {
  return <main id="main-content" className="page-shell max-w-3xl py-12"><p className="eyebrow text-ink-muted">A little help</p><h1 className="section-title mt-3">Keep your next move safe.</h1><div className="mt-8 grid gap-6">
    <section className="rounded-lg border border-line p-6"><h2 className="text-title-2">A suspicious listing</h2><p className="mt-3 text-subheadline leading-6">Open the listing and choose “Report this listing”. Sign in, choose a reason and explain what happened. Reports are saved for staff review; a report does not guarantee an immediate response or automatically remove a listing.</p><Link href="/safety" className="secondary-button mt-5">Renting safely</Link></section>
    <section className="rounded-lg border border-line p-6"><h2 className="text-title-2">Unwanted messages</h2><p className="mt-3 text-subheadline leading-6">Open the conversation and choose “Block this person”. This stops new messages and new contact reveals through Findaspace, across your conversations with them. Contact them through neither this app nor another channel if you feel unsafe.</p><Link href="/inbox" className="secondary-button mt-5">Open messages</Link></section>
    <section className="rounded-lg border border-line p-6"><h2 className="text-title-2">Your account</h2><p className="mt-3 text-subheadline leading-6">Manage your profile and connected sign-in methods, or delete your account. If a page fails, retry and keep its support reference; check whether a form saved before submitting it again.</p><Link href="/account" className="secondary-button mt-5">Account settings</Link></section>
    <p className="text-footnote text-ink-muted">Findaspace does not provide emergency assistance. If there is an immediate threat, seek local emergency help.</p>
  </div></main>;
}
