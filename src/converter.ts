// NANP-only for now: +1 country code, area code and exchange code can't start
// with 0 or 1 (see NANP central office code rules). Extending to other
// countries means these regexes stop being enough.

export type Format = "e164" | "national" | "e123";

const NANP_E164 = /^\+1([2-9]\d{2})([2-9]\d{2})(\d{4})$/;
const NANP_NATIONAL = /^\((\d{3})\)\s(\d{3})-(\d{4})$/;
// E.123 international notation: digit groups separated by single spaces,
// no parentheses or hyphens, e.g. "+1 202 555 0136".
const NANP_E123 = /^\+1\s([2-9]\d{2})\s([2-9]\d{2})\s(\d{4})$/;

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
  if (NANP_E123.test(trimmed)) return "e123";
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

export function toE123(e164: string): string {
  const match = NANP_E164.exec(e164.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.164 NANP number: "${e164}"`);
  }
  const [, area, exchange, subscriber] = match;
  return `+1 ${area} ${exchange} ${subscriber}`;
}

export function fromE123(e123: string): string {
  const match = NANP_E123.exec(e123.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.123-format NANP number: "${e123}"`);
  }
  const [, area, exchange, subscriber] = match;
  return `+1${area}${exchange}${subscriber}`;
}

// Detects whichever format it's given and converts it. E.164 and national
// are the two directions this was built for, so they toggle between each
// other; E.123 is just a spaced-out presentation of E.164, so it normalizes
// down to E.164 rather than toggling to national.
export function convert(input: string): string {
  const format = detectFormat(input);
  switch (format) {
    case "e164":
      return toNational(input);
    case "national":
      return toE164(input);
    case "e123":
      return fromE123(input);
  }
}
