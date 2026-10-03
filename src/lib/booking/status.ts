import type { components } from '@/lib/api/schema';

type Booking = components['schemas']['Booking'];

export type Next = 'pay' | 'wait' | 'none';

export type Described = {
  label: string; // the pill
  title: string; // what happened, in the guest's terms
  detail: string; // what it means for them now
  next: Next;
  tone: 'state' | 'muted' | 'danger';
};

// describe says, for a guest, what a booking's status means and what to do.
//
// Mirrors space_api's Payable rule exactly: a nightly booking is paid while
// held; a lease is paid only once the host has approved it. Showing a Pay
// button in any other state would send the guest to an error.
//
// "You were not charged" appears only for states that are reached before any
// payment: expired and declined both happen to held or approved bookings,
// which by definition were never paid.
export function describe(b: Pick<Booking, 'status' | 'rental_mode' | 'refund_minor'>, deadline?: string): Described {
  const by = deadline ? ` by ${deadline}` : '';
  switch (b.status) {
    case 'held':
      return b.rental_mode === 'nightly'
        ? { label: 'Waiting for payment', title: 'Your dates are held', detail: `Pay${by} to confirm. After that the hold ends and the dates open to others.`, next: 'pay', tone: 'state' }
        : { label: 'Request sent', title: 'Request sent to the host', detail: `The host has${deadline ? ` until ${deadline}` : ''} to respond. You pay nothing unless they approve.`, next: 'wait', tone: 'state' };
    case 'approved':
      return { label: 'Approved', title: 'The host approved your request', detail: `Pay${by} to secure it. If the payment window passes, the place opens to others.`, next: 'pay', tone: 'state' };
    case 'confirmed':
      return { label: 'Booked', title: "You're booked", detail: 'Payment received. Your host has been notified by SMS.', next: 'none', tone: 'state' };
    case 'active':
      return { label: 'In progress', title: 'Your stay is under way', detail: 'Message your host from here if anything is not right.', next: 'none', tone: 'state' };
    case 'completed':
      return { label: 'Completed', title: 'Completed', detail: 'Thank you for booking with Findaspace.', next: 'none', tone: 'muted' };
    case 'cancelled':
      return { label: 'Cancelled', title: 'This booking was cancelled', detail: b.refund_minor ? 'Your refund is on its way to the account you paid from.' : 'No refund was due under the cancellation policy.', next: 'none', tone: 'muted' };
    case 'declined':
      return { label: 'Declined', title: 'The host could not take this booking', detail: 'You were not charged. There are other places like it.', next: 'none', tone: 'danger' };
    case 'expired':
      return { label: 'Expired', title: 'This request expired', detail: 'It was not paid in time, so the dates were released. You were not charged.', next: 'none', tone: 'muted' };
  }
}

// describeForHost is the same booking from the other side of the table: what
// it means for the person being paid, and never a Pay button.
export function describeForHost(b: Pick<Booking, 'status' | 'rental_mode'>, guest: string): Omit<Described, 'next'> {
  switch (b.status) {
    case 'held':
      return b.rental_mode === 'term'
        ? { label: 'Needs your answer', title: `${guest} wants to rent`, detail: 'Approve or decline from your bookings before the request expires.', tone: 'state' }
        : { label: 'Reserved', title: `${guest} is paying`, detail: 'The dates are held while they pay. You will be notified once it is paid.', tone: 'state' };
    case 'approved':
      return { label: 'Approved', title: `Waiting for ${guest} to pay`, detail: 'If they do not pay in time, the dates open up again.', tone: 'state' };
    case 'confirmed':
      return { label: 'Booked', title: 'Booked and paid', detail: `The money is held until ${guest} moves in, then released to your payouts.`, tone: 'state' };
    case 'active':
      return { label: 'Staying', title: `${guest} is staying`, detail: 'Message them from your inbox if you need anything.', tone: 'state' };
    case 'completed':
      return { label: 'Completed', title: 'Completed', detail: 'The stay is over.', tone: 'muted' };
    case 'cancelled':
      return { label: 'Cancelled', title: 'This booking was cancelled', detail: 'The dates are open again.', tone: 'muted' };
    case 'declined':
      return { label: 'Declined', title: 'You declined this request', detail: 'The guest was not charged.', tone: 'muted' };
    case 'expired':
      return { label: 'Expired', title: 'This request expired', detail: 'It was not paid in time, so the dates were released.', tone: 'muted' };
  }
}
