#!/usr/bin/env node
import { pipeline } from "node:stream/promises";
import { LineConverter } from "./stream.js";

async function main(): Promise<void> {
  const converter = new LineConverter({
    onError: (err, line) => {
      process.stderr.write(`skipping "${line}": ${err.message}\n`);
      return null;
    },
  });
  await pipeline(process.stdin, converter, process.stdout);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
