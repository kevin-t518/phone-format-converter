import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, detectFormat, toE164, toNational, PhoneFormatError } from "./converter.js";

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
