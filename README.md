# phone-format-converter

Every system that touches phone numbers seems to pick a different format.
Databases tend to store E.164 (`+15551234567`) because it's unambiguous and
sorts consistently. People typing into a form write `(555) 123-4567`. Moving
data between the two by hand, or with a pile of one-off regexes, gets old
fast.

This is a small converter between E.164, national formatting, and E.123
international formatting. It detects which format it was given and converts
accordingly: E.164 and national toggle between each other, and E.123 — which
is really just E.164 with spaces instead of a compact digit string —
normalizes down to E.164.

Numbering plans are pluggable internally (see `NumberingPlan` in
`src/converter.ts`), but only NANP (US/Canada), France, and Spain are wired
up so far — see Roadmap for where this is headed.

## Library usage

```ts
import { convert, detectFormat, toE164, toNational, toE123, fromE123 } from "./src/converter.js";

// convert() and detectFormat() try every registered numbering plan.
convert("+15551234567");     // "(555) 123-4567"
convert("(555) 123-4567");   // "+15551234567"
convert("+1 555 123 4567");  // "+15551234567"
convert("+33123456789");     // "01 23 45 67 89"
convert("01 23 45 67 89");   // "+33123456789"
convert("+34912345678");     // "912 345 678"
convert("912 345 678");      // "+34912345678"

// toE164/toNational/toE123/fromE123 are NANP-specific.
toE164("(555) 123-4567");    // "+15551234567"
toNational("+15551234567");  // "(555) 123-4567"
toE123("+15551234567");      // "+1 555 123 4567"
fromE123("+1 555 123 4567"); // "+15551234567"
```

Malformed input throws `PhoneFormatError` rather than returning something
that merely looks plausible.

## Streaming CLI

The interesting constraint here is volume: a phone number list can be
millions of lines, and none of this should require holding the whole file in
memory to convert it. `LineConverter` is a `Transform` stream that only ever
buffers the current in-flight line — the rest of the input is never resident
in memory at once, regardless of file size.

Build and run:

```sh
npm run build
node dist/cli.js < numbers.txt > converted.txt
```

Input is one phone number per line, in either format; output is the
converted line, in the same order. Lines that don't parse are skipped with a
warning on stderr rather than aborting the whole run.

```
$ printf '+15551234567\n(555) 987-6543\n' | node dist/cli.js
(555) 123-4567
+15559876543
```

Run the tests with:

```sh
npm test
```

This project uses Node's built-in test runner (`node:test`), so there's
nothing to install — `tsc` compiles the `.test.ts` files alongside the
library and `node --test` runs the compiled output.

## Status

Conversion between E.164, national, and E.123 formatting for NANP, France,
and Spain, a streaming CLI, and a test suite covering round-trips and
malformed input for the converter and the line stream.

## Roadmap

- more numbering plans beyond NANP, France, and Spain
- CSV input/output mode (convert one column, pass the rest through)
- `--format` flag to force output format instead of auto-detecting
