import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, detectFormat, toE164, toNational, toE123, fromE123, PhoneFormatError } from "./converter.js";

test("detectFormat recognizes e164", () => {
  assert.equal(detectFormat("+15551234567"), "e164");
});

test("detectFormat recognizes national", () => {
  assert.equal(detectFormat("(555) 123-4567"), "national");
});

test("detectFormat trims surrounding whitespace", () => {
  assert.equal(detectFormat("  +15551234567  "), "e164");
});

test("detectFormat throws on unrecognized input", () => {
  assert.throws(() => detectFormat("555-123-4567"), PhoneFormatError);
});

test("toE164 converts a national number", () => {
  assert.equal(toE164("(555) 123-4567"), "+15551234567");
});

test("toE164 rejects an area code starting with 1", () => {
  assert.throws(() => toE164("(155) 123-4567"), PhoneFormatError);
});

test("toE164 rejects an area code starting with 0", () => {
  assert.throws(() => toE164("(055) 123-4567"), PhoneFormatError);
});

test("toE164 rejects a malformed national string", () => {
  assert.throws(() => toE164("555.123.4567"), PhoneFormatError);
});

test("toNational converts an e164 number", () => {
  assert.equal(toNational("+15551234567"), "(555) 123-4567");
});

test("toNational rejects a non-NANP country code", () => {
  assert.throws(() => toNational("+445551234567"), PhoneFormatError);
});

test("toNational rejects the wrong number of digits", () => {
  assert.throws(() => toNational("+1555123456"), PhoneFormatError);
});

test("convert round-trips national -> e164 -> national", () => {
  const original = "(555) 123-4567";
  assert.equal(toNational(toE164(original)), original);
});

test("convert round-trips e164 -> national -> e164", () => {
  const original = "+15551234567";
  assert.equal(toE164(toNational(original)), original);
});

test("convert picks the right direction for each format", () => {
  assert.equal(convert("+15551234567"), "(555) 123-4567");
  assert.equal(convert("(555) 123-4567"), "+15551234567");
});

test("convert throws PhoneFormatError on garbage input", () => {
  assert.throws(() => convert("not a phone number"), PhoneFormatError);
});

test("convert throws on an empty string", () => {
  assert.throws(() => convert(""), PhoneFormatError);
});

test("detectFormat recognizes e123", () => {
  assert.equal(detectFormat("+1 202 555 0136"), "e123");
});

test("toE123 converts an e164 number", () => {
  assert.equal(toE123("+12025550136"), "+1 202 555 0136");
});

test("toE123 rejects a malformed e164 string", () => {
  assert.throws(() => toE123("(202) 555-0136"), PhoneFormatError);
});

test("fromE123 converts to e164", () => {
  assert.equal(fromE123("+1 202 555 0136"), "+12025550136");
});

test("fromE123 rejects an area code starting with 1", () => {
  assert.throws(() => fromE123("+1 102 555 0136"), PhoneFormatError);
});

test("fromE123 rejects a malformed e123 string", () => {
  assert.throws(() => fromE123("+1 202-555-0136"), PhoneFormatError);
});

test("convert round-trips e164 -> e123 -> e164", () => {
  const original = "+12025550136";
  assert.equal(fromE123(toE123(original)), original);
});

test("convert normalizes e123 input to e164", () => {
  assert.equal(convert("+1 202 555 0136"), "+12025550136");
});

test("detectFormat recognizes a FR e164 number", () => {
  assert.equal(detectFormat("+33123456789"), "e164");
});

test("detectFormat recognizes a FR national number", () => {
  assert.equal(detectFormat("01 23 45 67 89"), "national");
});

test("detectFormat recognizes a FR e123 number", () => {
  assert.equal(detectFormat("+33 1 23 45 67 89"), "e123");
});

test("convert picks the right direction for FR numbers", () => {
  assert.equal(convert("+33123456789"), "01 23 45 67 89");
  assert.equal(convert("01 23 45 67 89"), "+33123456789");
  assert.equal(convert("+33 1 23 45 67 89"), "+33123456789");
});

test("convert round-trips a FR number national -> e164 -> national", () => {
  const original = "01 23 45 67 89";
  assert.equal(convert(convert(original)), original);
});

test("convert rejects a FR national number with a leading-0 trunk digit", () => {
  assert.throws(() => convert("00 23 45 67 89"), PhoneFormatError);
});

test("detectFormat recognizes an ES e164 number", () => {
  assert.equal(detectFormat("+34912345678"), "e164");
});

test("detectFormat recognizes an ES national number", () => {
  assert.equal(detectFormat("912 345 678"), "national");
});

test("detectFormat recognizes an ES e123 number", () => {
  assert.equal(detectFormat("+34 912 345 678"), "e123");
});

test("convert picks the right direction for ES numbers", () => {
  assert.equal(convert("+34912345678"), "912 345 678");
  assert.equal(convert("912 345 678"), "+34912345678");
  assert.equal(convert("+34 912 345 678"), "+34912345678");
});

test("convert round-trips an ES number national -> e164 -> national", () => {
  const original = "912 345 678";
  assert.equal(convert(convert(original)), original);
});

test("convert rejects an ES national number with a leading digit outside 6-9", () => {
  assert.throws(() => convert("512 345 678"), PhoneFormatError);
});

test("detectFormat recognizes a PT e164 number", () => {
  assert.equal(detectFormat("+351212345678"), "e164");
});

test("detectFormat recognizes a PT national number", () => {
  assert.equal(detectFormat("212 345 678"), "national");
});

test("detectFormat recognizes a PT e123 number", () => {
  assert.equal(detectFormat("+351 212 345 678"), "e123");
});

test("convert picks the right direction for PT numbers", () => {
  assert.equal(convert("+351212345678"), "212 345 678");
  assert.equal(convert("212 345 678"), "+351212345678");
  assert.equal(convert("+351 212 345 678"), "+351212345678");
});

test("convert round-trips a PT number national -> e164 -> national", () => {
  const original = "212 345 678";
  assert.equal(convert(convert(original)), original);
});

test("convert rejects a PT national number with a leading digit outside 2-3", () => {
  assert.throws(() => convert("112 345 678"), PhoneFormatError);
});
