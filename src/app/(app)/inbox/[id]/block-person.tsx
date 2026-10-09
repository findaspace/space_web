'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setBlock } from '../../trust/actions';
import { Modal } from '@/components/ui/modal';

export function BlockPerson({ threadId, blocked }: { threadId: string; blocked: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return <>
    <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-footnote underline">{blocked ? 'Unblock this person' : 'Block this person'}</button>
    {open && <Modal dismissible={!busy} titleId="block-title" onClose={() => setOpen(false)}>
      <h2 id="block-title" className="text-title-2">{blocked ? 'Allow messages again?' : 'Block this person?'}</h2>
      <p className="mt-3 text-subheadline">{blocked ? 'This removes your block. Messaging remains unavailable if the other person has blocked you or closed their account.' : 'Neither of you can send new messages or reveal new contact details through Findaspace. This applies to all your conversations with this person. Existing messages stay here; contact details already shared cannot be withdrawn.'}</p>
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      <button type="button" disabled={busy} onClick={async () => { if (busy) return; setBusy(true); setError(''); try { const result = await setBlock(threadId, !blocked); if (result.ok) { setOpen(false); router.refresh(); } else setError(result.error); } finally { setBusy(false); } }} className="primary-button mt-5 w-full">{busy ? 'Saving…' : blocked ? 'Unblock' : 'Block person'}</button>
      <button type="button" disabled={busy} onClick={() => setOpen(false)} className="secondary-button mt-3 w-full">Cancel</button>
    </Modal>}
  </>;
}
