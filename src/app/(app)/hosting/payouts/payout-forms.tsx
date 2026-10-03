'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { NETWORKS, guessNetwork, type NetworkCode } from '@/lib/hosting/momo';

import { requestPayout, savePayoutAccount } from '../actions';

const input = 'h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-body';
const primary =
  'flex h-12 w-full items-center justify-center rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed disabled:opacity-50';

export function AccountForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [network, setNetwork] = useState<NetworkCode>();
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // The network is suggested from the number the moment it is typed, but only
  // until the host picks one themselves: a ported number keeps its old prefix.
  const [picked, setPicked] = useState(false);
  function onNumber(value: string) {
    setNumber(value);
    if (!picked) setNetwork(guessNetwork(value) ?? undefined);
  }

  async function save() {
    if (!network) {
      setError('Choose the network.');
      return;
    }
    setBusy(true);
    setError(undefined);
    const res = await savePayoutAccount({ bankCode: network, number, name });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone?.();
    router.refresh();
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-footnote text-ink-muted">Mobile money number</span>
        <input value={number} onChange={(e) => onNumber(e.target.value)} type="tel" inputMode="tel" placeholder="024 412 3456" className={input} />
      </label>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Network">
        {NETWORKS.map((n) => (
          <button
            key={n.code}
            type="button"
            role="radio"
            aria-checked={network === n.code}
            onClick={() => {
              setNetwork(n.code);
              setPicked(true);
            }}
            className={`flex h-11 items-center rounded-full border px-4 text-subheadline ${
              network === n.code ? 'border-state bg-state-wash font-semibold text-state-ink' : 'border-line bg-surface text-ink-muted'
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-footnote text-ink-muted">Name on the account</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={input} />
      </label>
      <p className="mt-2 text-footnote text-ink-subtle">
        It must match the name registered to the number, or the network will refuse the transfer.
      </p>
      {error ? <p role="alert" className="mt-2 text-footnote text-danger">{error}</p> : null}
      <button type="button" onClick={save} disabled={busy} className={primary + ' mt-4'}>
        {busy ? 'Saving' : 'Save account'}
      </button>
    </div>
  );
}

export function ChangeAccount() {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="mt-4 border-t border-line pt-4">
      <AccountForm onDone={() => setOpen(false)} />
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="mt-2 min-h-11 text-subheadline font-semibold text-state-ink">
      Change account
    </button>
  );
}

export function WithdrawForm({ withdrawable }: { withdrawable: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(withdrawable);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  async function withdraw() {
    setBusy(true);
    setError(undefined);
    const res = await requestPayout(amount);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return <p className="text-body text-ink-muted">On its way. Mobile money transfers usually arrive within minutes.</p>;
  }

  return (
    <div>
      <div className="flex h-12 items-center gap-2 rounded-md border border-line-strong bg-surface px-4">
        <span className="text-body text-ink-muted">GHS</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          aria-label="Amount to withdraw"
          className="tabular min-w-0 flex-1 bg-transparent text-body outline-none"
        />
      </div>
      {error ? <p role="alert" className="mt-2 text-footnote text-danger">{error}</p> : null}
      <button type="button" onClick={withdraw} disabled={busy} className={primary + ' mt-3'}>
        {busy ? 'Sending' : 'Withdraw'}
      </button>
    </div>
  );
}
