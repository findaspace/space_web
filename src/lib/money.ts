// Money arrives from space_api as an integer in minor units: 450000 is
// GHS 4,500.00. This is the only function in the web app that turns that
// integer into text. Formatting money anywhere else is a bug.
//
// Integer arithmetic throughout. Dividing by 100 in floating point gives
// 1234567.89 as 1234567.8899999999, and a rounding step later is exactly where
// a pesewa goes missing from a total a guest is about to pay.

const grouping = new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 });

export type FormatOptions = {
  // Include the currency code. Off inside a column whose header already says
  // GHS, where repeating it on every row is noise.
  currency?: boolean;
};

// formatMinor writes GHS rather than the cedi sign, to match the SMS receipts
// space_api sends, where the sign would force a whole message into a costlier
// encoding. A guest comparing their text message to the screen sees the same
// string in both places.
//
// Pesewas are shown only when there are some. Rent is quoted in whole cedis,
// and "GHS 4,500.00" on every card is two characters of noise per listing.
export function formatMinor(minor: number, options: FormatOptions = {}): string {
  const { currency = true } = options;

  if (!Number.isSafeInteger(minor)) {
    throw new RangeError(`money must be a safe integer of minor units, got ${minor}`);
  }

  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs / 100);
  const pesewas = abs % 100;

  let amount = grouping.format(whole);
  if (pesewas !== 0) {
    amount += `.${String(pesewas).padStart(2, '0')}`;
  }

  const text = currency ? `GHS ${amount}` : amount;
  return negative ? `-${text}` : text;
}
