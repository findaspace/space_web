import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'Privacy and your account' };
export default function PrivacyPage() {
  return <main id="main-content" className="page-shell max-w-3xl py-12"><p className="eyebrow text-ink-muted">Your information</p><h1 className="section-title mt-3">Privacy and your account</h1><div className="mt-8 space-y-7 text-subheadline leading-7">
    <section><h2 className="text-title-2">What Findaspace uses</h2><p className="mt-3">Your name, connected sign-in methods and verified phone help you use your account, message people and publish listings. Listing information and uploaded listing photos are public when published. Conversations are available to their participants; reports are available to authorised staff.</p></section>
    <section><h2 className="text-title-2">Sign-in and device storage</h2><p className="mt-3">Secure session cookies keep you signed in. Saved spaces are stored on your device. Installed-app files help the interface load, but private account and conversation responses are not stored in the app’s offline cache. Google, Apple or Microsoft receive the information needed when you choose their sign-in method.</p></section>
    <section><h2 className="text-title-2">Your choices</h2><p className="mt-3">Edit your name and connected sign-in methods in your account. You can block new messages and contact reveals from a conversation, report a listing, or delete your account. Blocking cannot retract a phone number someone already received.</p></section>
    <section><h2 className="text-title-2">Deleting an account</h2><p className="mt-3">Deletion revokes sessions, removes profile details, withdraws listings and removes your message text. Necessary transaction and safety records retain account identifiers. Uploaded files enter a retryable removal queue after 24 hours; cached copies and backups may remain until they expire. Active bookings and staff responsibilities must be resolved first.</p></section>
    <div className="flex flex-wrap gap-3"><Link href="/account" className="primary-button">Manage my account</Link><Link href="/support" className="secondary-button">Help and safety</Link></div>
  </div></main>;
}
