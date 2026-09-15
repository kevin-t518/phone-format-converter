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
`src/converter.ts`), but only NANP (US/Canada), France, Spain, and Portugal
are wired up so far — see Roadmap for where this is headed.

## Library usage

```ts
import { convert, convertTo, detectFormat, toE164, toNational, toE123, fromE123 } from "./src/converter.js";

// convert(), convertTo(), and detectFormat() try every registered numbering plan.
convert("+15551234567");     // "(555) 123-4567"
convert("(555) 123-4567");   // "+15551234567"
convert("+1 555 123 4567");  // "+15551234567"
convert("+33123456789");     // "01 23 45 67 89"
convert("01 23 45 67 89");   // "+33123456789"
convert("+34912345678");     // "912 345 678"
convert("912 345 678");      // "+34912345678"
convert("+351212345678");    // "212 345 678"
convert("212 345 678");      // "+351212345678"

// convertTo() forces the output format instead of auto-detecting which
// direction to convert - useful when you want E.123 out regardless of
// whether the input was E.164 or national.
convertTo("(555) 123-4567", "e123"); // "+1 555 123 4567"
convertTo("+1 555 123 4567", "e123"); // "+1 555 123 4567"

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

By default the CLI auto-detects each line's format and toggles it (E.164 <->
national, E.123 normalizing to E.164), same as the library's `convert()`.
Pass `--format` with `e164`, `national`, or `e123` to force every line to
that output format instead:

```
$ printf '+15551234567\n(555) 987-6543\n' | node dist/cli.js --format e123
+1 555 123 4567
+1 555 987 6543
```

### CSV mode

Pass `--csv` to convert one column of a CSV file and leave the rest of each
row untouched. `--column` picks the column (0-based, defaults to 0) and
`--header` passes the first line through unconverted rather than trying to
parse it as a phone number:

```
$ printf 'name,phone\nAlice,+15551234567\nBob,(555) 987-6543\n' | node dist/cli.js --csv --column 1 --header
name,phone
Alice,(555) 123-4567
Bob,+15559876543
```

Quoting follows RFC 4180: fields are comma-separated, a field containing a
comma or quote is wrapped in double quotes, and quotes inside it are doubled.
As with the plain line mode, this assumes one record per line — a quoted
field with an embedded newline isn't supported.

`--format` works in CSV mode too, forcing just the phone number column to
the given format and leaving the rest of the row untouched.

Run the tests with:

```sh
npm test
```

This project uses Node's built-in test runner (`node:test`), so there's
nothing to install — `tsc` compiles the `.test.ts` files alongside the
library and `node --test` runs the compiled output.

## Status

Conversion between E.164, national, and E.123 formatting for NANP, France,
Spain, and Portugal, a streaming CLI with a CSV mode and a `--format` flag to
force output format, and a test suite covering round-trips and malformed
input for the converter, the line stream, and CSV parsing.

## Roadmap

- more numbering plans beyond NANP, France, Spain, and Portugal
