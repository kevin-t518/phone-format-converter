# phone-format-converter

Every system that touches phone numbers seems to pick a different format.
Databases tend to store E.164 (`+15551234567`) because it's unambiguous and
sorts consistently. People typing into a form write `(555) 123-4567`. Moving
data between the two by hand, or with a pile of one-off regexes, gets old
fast.

This is a small converter between E.164 and NANP national formatting
(US/Canada numbering plan only, for now — see Roadmap). It detects which of
the two formats it was given and converts to the other one.

## Library usage

```ts
import { convert, toE164, toNational } from "./src/converter.js";

convert("+15551234567");     // "(555) 123-4567"
convert("(555) 123-4567");   // "+15551234567"

toE164("(555) 123-4567");    // "+15551234567"
toNational("+15551234567");  // "(555) 123-4567"
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

NANP conversion in both directions, a streaming CLI, and a test suite
covering round-trips and malformed input for both the converter and the
line stream.

## Roadmap

- support E.123 international formatting, not just NANP national
- extend beyond NANP to other countries' numbering plans
- CSV input/output mode (convert one column, pass the rest through)
- `--format` flag to force output format instead of auto-detecting
