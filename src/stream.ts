import { Transform, type TransformCallback } from "node:stream";
import { convert, PhoneFormatError } from "./converter.js";

export interface LineConverterOptions {
  // Called when a line fails to parse. Return a replacement line to emit it
  // anyway, or null to drop the line and move on. If omitted, a bad line
  // aborts the stream.
  onError?: (error: PhoneFormatError, line: string) => string | null;
}

// Converts a line-delimited stream of phone numbers one line at a time.
// Only the trailing partial line is ever held in memory (`carry`), so input
// size has no bearing on memory use — a 10 GB file and a 10 KB file cost the
// same to process.
export class LineConverter extends Transform {
  private carry = "";
  private readonly onError?: LineConverterOptions["onError"];

  constructor(options: LineConverterOptions = {}) {
    super();
    this.onError = options.onError;
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.carry += chunk.toString("utf8");
    const lines = this.carry.split("\n");
    this.carry = lines.pop() ?? "";
    for (const line of lines) {
      this.pushConverted(line);
    }
    callback();
  }

  override _flush(callback: TransformCallback): void {
    if (this.carry.length > 0) {
      this.pushConverted(this.carry);
      this.carry = "";
    }
    callback();
  }

  private pushConverted(rawLine: string): void {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim() === "") {
      this.push("\n");
      return;
    }
    try {
      this.push(convert(line) + "\n");
    } catch (err) {
      if (err instanceof PhoneFormatError && this.onError) {
        const replacement = this.onError(err, line);
        if (replacement !== null) this.push(replacement + "\n");
        return;
      }
      throw err;
    }
  }
}
