// officecli-text.ts — normalise `officecli view <file> text --json` into cells with
// 0-based coordinates. OfficeCLI stays the only thing that reads the file; this
// only reshapes its JSON so a renderer can consume it without guessing.

export interface OfficeCliCell {
  row: number;
  column: number;
  a1: string;
  value: string;
  /** Numeric coercion when the cell parses as a finite number, else null. */
  numberValue: number | null;
}

export interface OfficeCliSheetView {
  name: string;
  totalRows: number;
  cells: OfficeCliCell[];
}

export interface OfficeCliTextView {
  fileName: string;
  sheets: OfficeCliSheetView[];
}

/** A1-style column letters to 0-based index. A -> 0, Z -> 25, AA -> 26. */
export function columnNameToIndex(name: string): number {
  const upper = name.toUpperCase();
  let n = 0;
  for (const ch of upper) {
    const code = ch.charCodeAt(0) - 64;
    if (code < 1 || code > 26) return -1;
    n = n * 26 + code;
  }
  return n - 1;
}

/** Parse "B4" into { row: 3, column: 1 } (0-based). Returns null if malformed. */
export function parseA1(ref: string): { row: number; column: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!match) return null;
  const column = columnNameToIndex(match[1]);
  if (column < 0) return null;
  const row = Number(match[2]);
  if (!Number.isInteger(row) || row < 1) return null;
  return { row: row - 1, column };
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Coerce officecli's `text --json` payload. Untrusted input: anything missing or
 * malformed is dropped, never guessed, so the viewer shows blanks over wrong values.
 */
export function parseOfficeCliTextJson(stdout: string): OfficeCliTextView {
  const empty: OfficeCliTextView = { fileName: "", sheets: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    return empty;
  }
  const root = parsed as { success?: unknown; data?: unknown } | null;
  if (!root || root.success !== true || !root.data || typeof root.data !== "object") {
    return empty;
  }
  const data = root.data as { fileName?: unknown; sheets?: unknown };
  const fileName = typeof data.fileName === "string" ? data.fileName : "";
  const rawSheets = Array.isArray(data.sheets) ? data.sheets : [];
  const sheets: OfficeCliSheetView[] = [];
  for (const rawSheet of rawSheets) {
    if (!rawSheet || typeof rawSheet !== "object") continue;
    const s = rawSheet as { name?: unknown; totalRows?: unknown; rows?: unknown };
    const name = typeof s.name === "string" ? s.name : "Sheet";
    const totalRows =
      typeof s.totalRows === "number" && Number.isFinite(s.totalRows) && s.totalRows >= 0
        ? Math.floor(s.totalRows)
        : 0;
    const cells: OfficeCliCell[] = [];
    if (Array.isArray(s.rows)) {
      for (const rawRow of s.rows) {
        if (!rawRow || typeof rawRow !== "object") continue;
        const rowNumber = (rawRow as { row?: unknown }).row;
        if (typeof rowNumber !== "number" || !Number.isFinite(rowNumber)) continue;
        const rawCells = (rawRow as { cells?: unknown }).cells;
        if (!rawCells || typeof rawCells !== "object") continue;
        for (const [ref, raw] of Object.entries(rawCells as Record<string, unknown>)) {
          const parsedRef = parseA1(ref);
          if (!parsedRef) continue;
          const value =
            raw === null || raw === undefined ? "" : String(raw);
          cells.push({
            row: parsedRef.row,
            column: parsedRef.column,
            a1: ref.toUpperCase(),
            value,
            numberValue: toNumber(value),
          });
        }
      }
    }
    sheets.push({ name, totalRows, cells });
  }
  return { fileName, sheets };
}
