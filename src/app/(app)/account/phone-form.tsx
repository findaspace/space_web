'use client';
import { useActionState } from 'react';
import { connectPhone } from './phone-actions';
export function PhoneForm() {
 const [state, action, pending] = useActionState(connectPhone, { sent: false, phone: '' });
 if (state.done) return <p role="status" className="mt-4 text-subheadline">Your phone is verified and connected.</p>;
 return <form action={action} className="mt-4 grid gap-3">
  <label htmlFor="account-phone" className="text-subheadline font-semibold">Contact phone</label>
  <input id="account-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="024 123 4567" defaultValue={state.phone} readOnly={state.sent} required className="field-input" />
  {state.sent && <><label htmlFor="account-code" className="text-subheadline font-semibold">6-digit SMS code</label><input id="account-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="field-input" /></>}
  {state.error && <p role="alert" className="text-footnote text-danger">{state.error}</p>}
  <button name="intent" value={state.sent ? 'verify' : 'send'} disabled={pending} className="primary-button">{pending ? 'Please wait…' : state.sent ? 'Verify and connect' : 'Send verification code'}</button>
 </form>;
}
