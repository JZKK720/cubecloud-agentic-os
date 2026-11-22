// a2ui.ts — the narrow, validated subset of A2UI this product adopts.
//
// WHAT THIS IS: one block type — a table — that an agent can emit as structured
// data instead of hoping Markdown parses. It exists because the chat surface
// can otherwise present only prose and Markdown, so an agent has no reliable
// way to say "here is a table with these exact columns and these exact cells".
//
// WHAT THIS IS NOT, deliberately:
//   - No free-form component tree. The wire shape is a closed union; anything
//     else is REJECTED, not rendered best-effort.
//   - No model-authored HTML or JS. `OGU` was refused upstream of this decision
//     and stays refused — it is a code-execution surface.
//   - No third-party classifier routing between the two. Jev was refused too.
//
// WHY VALIDATE AT ALL: the input is model output. Rendering arbitrary JSON as
// UI is how a hallucinated field becomes a broken screen, and rendering
// arbitrary markup is how a hallucinated tag becomes an injection. So every
// field is checked, unknown keys are refused, and cell values are coerced to
// plain text — never interpolated as markup.
//
// REUSE: the rendered table uses the existing `.chat-bubble-agent table/th/td`
// styles, so adopting A2UI changes no visual language. No new CSS is required
// for the table itself.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

/** The only block type this product accepts from an agent. */
export interface A2uiTableBlock {
  type: "table";
  /** Column headers, in display order. Must be non-empty. */
  columns: string[];
  /** Rows of cell values, already positioned. Each row must match
   *  `columns.length` exactly. */
  rows: string[][];
  /** Optional caption rendered above the table. */
  caption?: string;
}

/** A validated block, or a rejection with a reason. */
export type A2uiParseResult =
  | { ok: true; block: A2uiTableBlock }
  | { ok: false; error: string };

/** Hard cap on rendered size.
 *
 *  Not a security boundary — a display one. A 10,000-row table from a confused
 *  model would freeze the renderer's layout pass, and the operator cannot read
 *  it anyway. The caller shows the rejection rather than a truncated table,
 *  because a silently truncated table is a wrong table. */
export const A2UI_MAX_COLUMNS = 12;
export const A2UI_MAX_ROWS = 200;
export const A2UI_MAX_CELL_CHARS = 500;
export const A2UI_MAX_CAPTION_CHARS = 200;

function asText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  // null/undefined become an explicit empty cell; objects and arrays are
  // refused rather than stringified, because "[object Object]" in a table cell
  // is a bug the operator cannot diagnose.
  if (value === null || value === undefined) return "";
  return null;
}

/**
 * Validate one block. Never throws.
 *
 * Rejects, rather than repairs: a model that emitted a malformed block will be
 * told so and can correct itself, whereas a repaired block silently shows
 * something the model did not intend.
 */
export function parseA2uiBlock(input: unknown): A2uiParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "block must be an object" };
  }
  const rec = input as Record<string, unknown>;

  const type = rec.type;
  if (type !== "table") {
    // A closed union with one member. This is where a future block type is
    // added, deliberately, with its own validation.
    return {
      ok: false,
      error: `unsupported block type: ${String(type)}`,
    };
  }

  // Refuse unknown keys: a model adding `onClick` or `html` must be told no,
  // not ignored, so it learns the shape.
  const allowed = new Set(["type", "columns", "rows", "caption"]);
  for (const key of Object.keys(rec)) {
    if (!allowed.has(key)) {
      return { ok: false, error: `unexpected field: ${key}` };
    }
  }

  if (!Array.isArray(rec.columns) || rec.columns.length === 0) {
    return { ok: false, error: "columns must be a non-empty array" };
  }
  if (rec.columns.length > A2UI_MAX_COLUMNS) {
    return {
      ok: false,
      error: `too many columns (${rec.columns.length} > ${A2UI_MAX_COLUMNS})`,
    };
  }

  const columns: string[] = [];
  for (const [i, column] of rec.columns.entries()) {
    const text = asText(column);
    if (text === null) {
      return { ok: false, error: `column ${i} is not a text value` };
    }
    if (text.length > A2UI_MAX_CELL_CHARS) {
      return { ok: false, error: `column ${i} is too long` };
    }
    columns.push(text);
  }

  if (!Array.isArray(rec.rows)) {
    return { ok: false, error: "rows must be an array" };
  }
  if (rec.rows.length > A2UI_MAX_ROWS) {
    return {
      ok: false,
      error: `too many rows (${rec.rows.length} > ${A2UI_MAX_ROWS})`,
    };
  }

  const rows: string[][] = [];
  for (const [r, row] of rec.rows.entries()) {
    if (!Array.isArray(row)) {
      return { ok: false, error: `row ${r} must be an array` };
    }
    if (row.length !== columns.length) {
      return {
        ok: false,
        error: `row ${r} has ${row.length} cells, expected ${columns.length}`,
      };
    }
    const cells: string[] = [];
    for (const [c, cell] of row.entries()) {
      const text = asText(cell);
      if (text === null) {
        return { ok: false, error: `row ${r} cell ${c} is not a text value` };
      }
      if (text.length > A2UI_MAX_CELL_CHARS) {
        return { ok: false, error: `row ${r} cell ${c} is too long` };
      }
      cells.push(text);
    }
    rows.push(cells);
  }

  let caption: string | undefined;
  if (rec.caption !== undefined) {
    const text = asText(rec.caption);
    if (text === null) {
      return { ok: false, error: "caption is not a text value" };
    }
    if (text.length > A2UI_MAX_CAPTION_CHARS) {
      return { ok: false, error: "caption is too long" };
    }
    caption = text;
  }

  return {
    ok: true,
    block: caption === undefined ? { type: "table", columns, rows } : { type: "table", columns, rows, caption },
  };
}
