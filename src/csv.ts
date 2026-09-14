import { PhoneFormatError, convert } from "./converter.js";
import { LineSplittingTransform } from "./stream.js";

// Minimal RFC 4180-style CSV: comma-separated fields, double-quote as the
// quote character, "" as an escaped quote inside a quoted field. Records are
// assumed to be one per line, matching the rest of this project's
// line-delimited streaming model — a quoted field containing an embedded
// newline is not supported.
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

export function formatCsvField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function formatCsvLine(fields: string[]): string {
  return fields.map(formatCsvField).join(",");
}

export interface CsvLineConverterOptions {
  // 0-based index of the column holding the phone number. Defaults to 0.
  column?: number;
  // If true, the first line is passed through unconverted (a header row).
  header?: boolean;
  // Called when a line fails to convert, either because the phone number
  // column doesn't parse or because the line doesn't have that many
  // columns. Return a replacement line to emit it anyway, or null to drop
  // the line and move on. If omitted, a bad line aborts the stream.
  onError?: (error: PhoneFormatError, line: string) => string | null;
}

// Converts one column of a CSV stream, passing every other column through
// unchanged, one line at a time.
export class CsvLineConverter extends LineSplittingTransform {
  private readonly column: number;
  private readonly header: boolean;
  private readonly onError?: CsvLineConverterOptions["onError"];
  private sawHeader = false;

  constructor(options: CsvLineConverterOptions = {}) {
    super();
    this.column = options.column ?? 0;
    this.header = options.header ?? false;
    this.onError = options.onError;
  }

  protected override processLine(line: string): void {
    if (this.header && !this.sawHeader) {
      this.sawHeader = true;
      this.push(line + "\n");
      return;
    }
    if (line.trim() === "") {
      this.push("\n");
      return;
    }
    const fields = parseCsvLine(line);
    if (this.column >= fields.length) {
      this.handleError(
        new PhoneFormatError(`line has ${fields.length} column(s), no column ${this.column}: "${line}"`),
        line,
      );
      return;
    }
    try {
      fields[this.column] = convert(fields[this.column]);
      this.push(formatCsvLine(fields) + "\n");
    } catch (err) {
      if (err instanceof PhoneFormatError) {
        this.handleError(err, line);
        return;
      }
      throw err;
    }
  }

  private handleError(err: PhoneFormatError, line: string): void {
    if (!this.onError) throw err;
    const replacement = this.onError(err, line);
    if (replacement !== null) this.push(replacement + "\n");
  }
}
