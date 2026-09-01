import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { LineConverter } from "./stream.js";
import { PhoneFormatError } from "./converter.js";

async function run(chunks: string[], options?: ConstructorParameters<typeof LineConverter>[0]): Promise<string> {
  const converter = new LineConverter(options);
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

test("converts multiple lines delivered in one chunk", async () => {
  const output = await run(["+15551234567\n(555) 987-6543\n"]);
  assert.equal(output, "(555) 123-4567\n+15559876543\n");
});

test("reassembles a line split across two chunks", async () => {
  const output = await run(["+1555123", "4567\n"]);
  assert.equal(output, "(555) 123-4567\n");
});

test("processes a final line with no trailing newline", async () => {
  const output = await run(["+15551234567"]);
  assert.equal(output, "(555) 123-4567\n");
});

test("passes blank lines through unchanged", async () => {
  const output = await run(["+15551234567\n\n(555) 987-6543\n"]);
  assert.equal(output, "(555) 123-4567\n\n+15559876543\n");
});

test("strips a trailing carriage return", async () => {
  const output = await run(["+15551234567\r\n"]);
  assert.equal(output, "(555) 123-4567\n");
});

test("onError replacement is emitted in place of the bad line", async () => {
  const output = await run(["not a number\n+15551234567\n"], {
    onError: () => "REPLACED",
  });
  assert.equal(output, "REPLACED\n(555) 123-4567\n");
});

test("onError returning null drops the line", async () => {
  const output = await run(["not a number\n+15551234567\n"], {
    onError: () => null,
  });
  assert.equal(output, "(555) 123-4567\n");
});

test("without onError a malformed line aborts the stream", async () => {
  await assert.rejects(() => run(["not a number\n"]), PhoneFormatError);
});
