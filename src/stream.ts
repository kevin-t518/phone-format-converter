import { Transform, type TransformCallback } from "node:stream";
import { convert, convertTo, type Format, PhoneFormatError } from "./converter.js";

// Shared plumbing for any Transform that processes a byte stream one
// newline-delimited line at a time. Only the trailing partial line is ever
// held in memory (`carry`), so input size has no bearing on memory use — a
// 10 GB file and a 10 KB file cost the same to process. Subclasses just
// decide what a line turns into.
export abstract class LineSplittingTransform extends Transform {
  private carry = "";

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.carry += chunk.toString("utf8");
    const lines = this.carry.split("\n");
    this.carry = lines.pop() ?? "";
    for (const line of lines) {
      this.processLine(line.replace(/\r$/, ""));
    }
    callback();
  }

  override _flush(callback: TransformCallback): void {
    if (this.carry.length > 0) {
      this.processLine(this.carry.replace(/\r$/, ""));
      this.carry = "";
    }
    callback();
  }

  // Handle one line (CR already stripped) and this.push() whatever it
  // becomes, including the trailing newline.
  protected abstract processLine(line: string): void;
}

export interface LineConverterOptions {
  // Forces every line to the given output format instead of auto-detecting
  // (E.164 <-> national, E.123 normalizing to E.164). Leave unset to
  // auto-detect.
  format?: Format;
  // Called when a line fails to parse. Return a replacement line to emit it
  // anyway, or null to drop the line and move on. If omitted, a bad line
  // aborts the stream.
  onError?: (error: PhoneFormatError, line: string) => string | null;
}

// Converts a line-delimited stream of phone numbers one line at a time.
export class LineConverter extends LineSplittingTransform {
  private readonly format?: Format;
  private readonly onError?: LineConverterOptions["onError"];

  constructor(options: LineConverterOptions = {}) {
    super();
    this.format = options.format;
    this.onError = options.onError;
  }

  protected override processLine(line: string): void {
    if (line.trim() === "") {
      this.push("\n");
      return;
    }
    try {
      this.push((this.format ? convertTo(line, this.format) : convert(line)) + "\n");
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
