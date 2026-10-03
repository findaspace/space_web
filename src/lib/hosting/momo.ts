// Mobile money networks as hosts know them, and the codes space_api accepts.
// The brands changed (Vodafone Cash is now Telecel Cash, AirtelTigo Money is
// AT Money); the codes did not, so the button says the brand and sends the code.
export const NETWORKS = [
  { code: 'MTN', label: 'MTN MoMo' },
  { code: 'VOD', label: 'Telecel Cash' },
  { code: 'ATL', label: 'AT Money' },
] as const;

export type NetworkCode = (typeof NETWORKS)[number]['code'];

// The network that originally issued each prefix, mirroring space_api. Numbers
// can be ported between networks, so this only pre-selects a choice the host
// can change; it never decides for them.
const PREFIXES: Record<string, NetworkCode> = {
  '24': 'MTN', '25': 'MTN', '53': 'MTN', '54': 'MTN', '55': 'MTN', '59': 'MTN',
  '20': 'VOD', '50': 'VOD',
  '26': 'ATL', '27': 'ATL', '56': 'ATL', '57': 'ATL',
};

// nationalDigits reduces any common way of writing a Ghanaian number to its
// nine national digits: 0244123456, 244123456, +233 24 412 3456.
export function nationalDigits(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const national = digits.startsWith('233') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits;
  return /^\d{9}$/.test(national) ? national : null;
}

export function guessNetwork(input: string): NetworkCode | null {
  const n = nationalDigits(input);
  return n ? (PREFIXES[n.slice(0, 2)] ?? null) : null;
}

// maskNumber shows enough to recognise an account and no more: the last four.
export function maskNumber(number: string): string {
  const digits = number.replace(/\D/g, '');
  return digits.length <= 4 ? digits : `ending ${digits.slice(-4)}`;
}

export function networkLabel(code: string): string {
  return NETWORKS.find((n) => n.code === code)?.label ?? code;
}
