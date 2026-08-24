// NANP-only for now: +1 country code, area code and exchange code can't start
// with 0 or 1 (see NANP central office code rules). Extending to other
// countries means this pair of regexes stops being enough.

export type Format = "e164" | "national";

const NANP_E164 = /^\+1([2-9]\d{2})([2-9]\d{2})(\d{4})$/;
const NANP_NATIONAL = /^\((\d{3})\)\s(\d{3})-(\d{4})$/;

export class PhoneFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneFormatError";
  }
}

export function detectFormat(input: string): Format {
  const trimmed = input.trim();
  if (NANP_E164.test(trimmed)) return "e164";
  if (NANP_NATIONAL.test(trimmed)) return "national";
  throw new PhoneFormatError(`unrecognized phone number format: "${input}"`);
}

export function toE164(national: string): string {
  const match = NANP_NATIONAL.exec(national.trim());
  if (!match) {
    throw new PhoneFormatError(`not a national-format NANP number: "${national}"`);
  }
  const [, area, exchange, subscriber] = match;
  return `+1${area}${exchange}${subscriber}`;
}

export function toNational(e164: string): string {
  const match = NANP_E164.exec(e164.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.164 NANP number: "${e164}"`);
  }
  const [, area, exchange, subscriber] = match;
  return `(${area}) ${exchange}-${subscriber}`;
}

// Detects whichever of the two formats it's given and converts to the other.
export function convert(input: string): string {
  const format = detectFormat(input);
  return format === "e164" ? toNational(input) : toE164(input);
}
