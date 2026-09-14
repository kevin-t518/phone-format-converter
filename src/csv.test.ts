import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parseCsvLine, formatCsvLine, CsvLineConverter } from "./csv.js";
import { PhoneFormatError } from "./converter.js";

test("parseCsvLine splits plain fields on commas", () => {
  assert.deepEqual(parseCsvLine("a,b,c"), ["a", "b", "c"]);
});

test("parseCsvLine unquotes a quoted field", () => {
  assert.deepEqual(parseCsvLine('"a","b,c",d'), ["a", "b,c", "d"]);
});

test("parseCsvLine unescapes doubled quotes inside a quoted field", () => {
  assert.deepEqual(parseCsvLine('"say ""hi""",b'), ['say "hi"', "b"]);
});

test("parseCsvLine handles a single empty field", () => {
  assert.deepEqual(parseCsvLine(""), [""]);
});

test("formatCsvLine leaves plain fields unquoted", () => {
  assert.equal(formatCsvLine(["a", "b", "c"]), "a,b,c");
});

test("formatCsvLine quotes a field containing a comma", () => {
  assert.equal(formatCsvLine(["a", "b,c"]), 'a,"b,c"');
});

test("formatCsvLine escapes quotes inside a quoted field", () => {
  assert.equal(formatCsvLine(['say "hi"']), '"say ""hi"""');
});

test("parseCsvLine and formatCsvLine round-trip a quoted field", () => {
  const fields = ["plain", 'has "quotes" and, a comma'];
  assert.deepEqual(parseCsvLine(formatCsvLine(fields)), fields);
});

async function run(chunks: string[], options?: ConstructorParameters<typeof CsvLineConverter>[0]): Promise<string> {
  const converter = new CsvLineConverter(options);
  let output = "";
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString("utf8");
      callback();
    },
  });
  await pipeline(Readable.from(chunks), converter, sink);
  return output;
}

test("converts the default (first) column and passes the rest through", async () => {
  const output = await run(["+15551234567,Alice,Sales\n"]);
  assert.equal(output, "(555) 123-4567,Alice,Sales\n");
});

test("converts a non-default column", async () => {
  const output = await run(["Alice,+15551234567,Sales\n"], { column: 1 });
  assert.equal(output, "Alice,(555) 123-4567,Sales\n");
});

test("passes a header row through unconverted", async () => {
  const output = await run(["name,phone\nAlice,+15551234567\n"], { column: 1, header: true });
  assert.equal(output, "name,phone\nAlice,(555) 123-4567\n");
});

test("re-quotes a passed-through field that needs it", async () => {
  const output = await run(['+15551234567,"Smith, Alice"\n']);
  assert.equal(output, '(555) 123-4567,"Smith, Alice"\n');
});

test("onError replacement is emitted for a malformed phone column", async () => {
  const output = await run(["not a number,Alice\n"], { onError: () => "REPLACED" });
  assert.equal(output, "REPLACED\n");
});

test("onError replacement is emitted when the line is missing the target column", async () => {
  const output = await run(["onlyonecolumn\n"], { column: 3, onError: () => "REPLACED" });
  assert.equal(output, "REPLACED\n");
});

test("onError returning null drops the line", async () => {
  const output = await run(["not a number,Alice\n+15551234567,Bob\n"], { onError: () => null });
  assert.equal(output, "(555) 123-4567,Bob\n");
});

test("without onError a malformed phone column aborts the stream", async () => {
  await assert.rejects(() => run(["not a number,Alice\n"]), PhoneFormatError);
});

test("without onError a missing column aborts the stream", async () => {
  await assert.rejects(() => run(["onlyonecolumn\n"], { column: 3 }), PhoneFormatError);
});
