// Per-country numbering plans live behind the NumberingPlan interface below.
// toE164/toNational/toE123/fromE123 stay NANP-specific (that's the plan this
// library was originally built around, and the one most callers still want
// by name); detectFormat and convert are the plan-agnostic entry points that
// try every registered plan in PLANS.

export type Format = "e164" | "national" | "e123";

interface NumberingPlan {
  readonly e164: RegExp;
  readonly national: RegExp;
  readonly e123: RegExp;
  toE164(national: string): string;
  toNational(e164: string): string;
  toE123(e164: string): string;
  fromE123(e123: string): string;
}

// NANP: +1 country code, area code and exchange code can't start with 0 or 1
// (see NANP central office code rules).
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

const NANP_PLAN: NumberingPlan = {
  e164: NANP_E164,
  national: NANP_NATIONAL,
  e123: NANP_E123,
  toE164,
  toNational,
  toE123,
  fromE123,
};

// France: +33 country code, 9-digit national significant number, first digit
// 1-9 (the leading 0 in national notation is a trunk prefix, not part of the
// number itself, so it's dropped when converting to E.164).
const FR_E164 = /^\+33([1-9]\d{8})$/;
const FR_NATIONAL = /^0([1-9])\s(\d{2})\s(\d{2})\s(\d{2})\s(\d{2})$/;
const FR_E123 = /^\+33\s([1-9])\s(\d{2})\s(\d{2})\s(\d{2})\s(\d{2})$/;

function frToE164(national: string): string {
  const match = FR_NATIONAL.exec(national.trim());
  if (!match) {
    throw new PhoneFormatError(`not a national-format FR number: "${national}"`);
  }
  const [, first, a, b, c, d] = match;
  return `+33${first}${a}${b}${c}${d}`;
}

function frToNational(e164: string): string {
  const match = FR_E164.exec(e164.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.164 FR number: "${e164}"`);
  }
  const digits = match[1];
  return `0${digits[0]} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

function frToE123(e164: string): string {
  const match = FR_E164.exec(e164.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.164 FR number: "${e164}"`);
  }
  const digits = match[1];
  return `+33 ${digits[0]} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

function frFromE123(e123: string): string {
  const match = FR_E123.exec(e123.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.123-format FR number: "${e123}"`);
  }
  const [, first, a, b, c, d] = match;
  return `+33${first}${a}${b}${c}${d}`;
}

const FRANCE_PLAN: NumberingPlan = {
  e164: FR_E164,
  national: FR_NATIONAL,
  e123: FR_E123,
  toE164: frToE164,
  toNational: frToNational,
  toE123: frToE123,
  fromE123: frFromE123,
};

// Spain: +34 country code, 9-digit national significant number, no trunk
// prefix (unlike NANP and France, the number you dial domestically is
// exactly the national significant number). Geographic and mobile numbers
// both fall in the 6-9 leading digit range; national and E.123 notation
// both group the digits in threes, the E.123 form just adds the prefix.
const ES_E164 = /^\+34([6-9]\d{8})$/;
const ES_NATIONAL = /^([6-9]\d{2}) (\d{3}) (\d{3})$/;
const ES_E123 = /^\+34\s([6-9]\d{2})\s(\d{3})\s(\d{3})$/;

function esToE164(national: string): string {
  const match = ES_NATIONAL.exec(national.trim());
  if (!match) {
    throw new PhoneFormatError(`not a national-format ES number: "${national}"`);
  }
  const [, a, b, c] = match;
  return `+34${a}${b}${c}`;
}

function esToNational(e164: string): string {
  const match = ES_E164.exec(e164.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.164 ES number: "${e164}"`);
  }
  const digits = match[1];
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

function esToE123(e164: string): string {
  const match = ES_E164.exec(e164.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.164 ES number: "${e164}"`);
  }
  const digits = match[1];
  return `+34 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

function esFromE123(e123: string): string {
  const match = ES_E123.exec(e123.trim());
  if (!match) {
    throw new PhoneFormatError(`not an E.123-format ES number: "${e123}"`);
  }
  const [, a, b, c] = match;
  return `+34${a}${b}${c}`;
}

const SPAIN_PLAN: NumberingPlan = {
  e164: ES_E164,
  national: ES_NATIONAL,
  e123: ES_E123,
  toE164: esToE164,
  toNational: esToNational,
  toE123: esToE123,
  fromE123: esFromE123,
};

// Every plan's regexes are anchored to that country's prefix (+1, +33, +34,
// ...) or national trunk format, so plans never ambiguously match each
// other's input - trying them in order and stopping at the first match is
// safe.
const PLANS: readonly NumberingPlan[] = [NANP_PLAN, FRANCE_PLAN, SPAIN_PLAN];

export function detectFormat(input: string): Format {
  const trimmed = input.trim();
  for (const plan of PLANS) {
    if (plan.e164.test(trimmed)) return "e164";
    if (plan.national.test(trimmed)) return "national";
    if (plan.e123.test(trimmed)) return "e123";
  }
  throw new PhoneFormatError(`unrecognized phone number format: "${input}"`);
}

// Detects whichever format it's given, and whichever registered numbering
// plan it belongs to, and converts it. E.164 and national are the two
// directions this was built for, so they toggle between each other; E.123 is
// just a spaced-out presentation of E.164, so it normalizes down to E.164
// rather than toggling to national.
export function convert(input: string): string {
  const trimmed = input.trim();
  for (const plan of PLANS) {
    if (plan.e164.test(trimmed)) return plan.toNational(input);
    if (plan.national.test(trimmed)) return plan.toE164(input);
    if (plan.e123.test(trimmed)) return plan.fromE123(input);
  }
  throw new PhoneFormatError(`unrecognized phone number format: "${input}"`);
}
