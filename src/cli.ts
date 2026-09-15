#!/usr/bin/env node
import { pipeline } from "node:stream/promises";
import { LineConverter } from "./stream.js";
import { CsvLineConverter } from "./csv.js";
import type { Format, PhoneFormatError } from "./converter.js";

const FORMATS: readonly Format[] = ["e164", "national", "e123"];

interface CliOptions {
  csv: boolean;
  column: number;
  header: boolean;
  format?: Format;
}

function parseFormat(value: string | undefined): Format {
  if (value === undefined || !(FORMATS as readonly string[]).includes(value)) {
    throw new Error(`--format expects one of ${FORMATS.join(", ")}, got "${value}"`);
  }
  return value as Format;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { csv: false, column: 0, header: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--csv") {
      options.csv = true;
    } else if (arg === "--column") {
      const value = argv[++i];
      const parsed = value === undefined ? NaN : Number.parseInt(value, 10);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`--column expects a non-negative integer, got "${value}"`);
      }
      options.column = parsed;
    } else if (arg === "--header") {
      options.header = true;
    } else if (arg === "--format") {
      options.format = parseFormat(argv[++i]);
    } else {
      throw new Error(`unrecognized argument: "${arg}"`);
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const onError = (err: PhoneFormatError, line: string): null => {
    process.stderr.write(`skipping "${line}": ${err.message}\n`);
    return null;
  };
  const converter = options.csv
    ? new CsvLineConverter({ column: options.column, header: options.header, format: options.format, onError })
    : new LineConverter({ format: options.format, onError });
  await pipeline(process.stdin, converter, process.stdout);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
