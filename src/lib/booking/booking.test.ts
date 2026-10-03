import { describe as suite, expect, it } from 'vitest';

import { addDays, firstTakenNight, formatDate, formatDeadline, nightsBetween, parseISODate } from './dates';
import { describe } from './status';

suite('dates', () => {
  it('counts nights between dates', () => {
    expect(nightsBetween('2026-11-01', '2026-11-04')).toBe(3);
    expect(nightsBetween('2026-12-30', '2027-01-02')).toBe(3);
  });

  it('rejects impossible dates rather than rolling them over', () => {
    expect(parseISODate('2026-02-30')).toBeNull();
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('1/11/2026')).toBeNull();
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  // The guest leaving on the 4th does not need the night of the 4th, so a
  // stay ending the day someone else arrives is allowed.
  it('checks only the nights actually stayed', () => {
    const taken = new Set(['2026-11-04']);
    expect(firstTakenNight('2026-11-01', '2026-11-04', taken)).toBeNull();
    expect(firstTakenNight('2026-11-01', '2026-11-05', taken)).toBe('2026-11-04');
  });

  it('formats dates for people', () => {
    expect(formatDate('2026-11-01')).toMatch(/Sun.*1.*Nov.*2026/);
  });

  it('shows only the time for a deadline later today, and the day beyond that', () => {
    const now = new Date('2026-09-26T10:00:00Z');
    expect(formatDeadline('2026-09-26T10:30:00Z', now)).toMatch(/^10:30$/);
    expect(formatDeadline('2026-09-28T10:00:00Z', now)).toMatch(/Mon/);
  });
});

suite('describe', () => {
  // Pay appears exactly where space_api's Payable allows it, never elsewhere.
  it.each([
    ['held', 'nightly', 'pay'],
    ['held', 'term', 'wait'],
    ['approved', 'term', 'pay'],
    ['confirmed', 'term', 'none'],
    ['confirmed', 'nightly', 'none'],
    ['declined', 'term', 'none'],
    ['expired', 'nightly', 'none'],
  ] as const)('%s %s -> %s', (status, mode, next) => {
    expect(describe({ status, rental_mode: mode }).next).toBe(next);
  });

  it('never tells a guest they were charged for a state that precedes payment', () => {
    for (const status of ['declined', 'expired'] as const) {
      expect(describe({ status, rental_mode: 'term' }).detail).toContain('not charged');
    }
  });

  it('puts the deadline into the sentence', () => {
    expect(describe({ status: 'held', rental_mode: 'nightly' }, '14:32').detail).toContain('by 14:32');
    expect(describe({ status: 'held', rental_mode: 'term' }, 'Mon 28 Sept, 10:00').detail).toContain('until Mon 28 Sept');
  });

  it('distinguishes a cancellation with a refund from one without', () => {
    expect(describe({ status: 'cancelled', rental_mode: 'nightly', refund_minor: 50000 }).detail).toContain('refund is on its way');
    expect(describe({ status: 'cancelled', rental_mode: 'nightly' }).detail).toContain('No refund');
  });
});

import { describeForHost } from './status';

suite('describeForHost', () => {
  it('names the guest', () => {
    expect(describeForHost({ status: 'held', rental_mode: 'term' }, 'Ama').title).toBe('Ama wants to rent');
  });

  it('explains the host side of escrow once paid', () => {
    expect(describeForHost({ status: 'confirmed', rental_mode: 'term' }, 'Ama').detail).toContain('held until Ama moves in');
  });

  // The type has no next step at all, so a Pay button cannot be derived from it.
  it('never offers the host a way to pay', () => {
    expect('next' in describeForHost({ status: 'approved', rental_mode: 'term' }, 'Ama')).toBe(false);
  });
});
