/**
 * A2UI table block — validation and rendering.
 *
 * The contract is narrow on purpose: one block type, a closed field set, and
 * rejection rather than repair. These tests exist because the input is MODEL
 * OUTPUT, so every one of them is a way a hallucination could reach the screen.
 *
 * The rendering half asserts the injection defence that matters: cell text is a
 * React child, so `<script>` renders as characters. If someone ever switches a
 * cell to `dangerouslySetInnerHTML`, the XSS test below fails.
 */

import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  A2UI_MAX_CELL_CHARS,
  A2UI_MAX_COLUMNS,
  A2UI_MAX_ROWS,
  parseA2uiBlock,
} from "../src/shared/a2ui";
import { A2uiBlock } from "../src/renderer/src/components/A2uiBlock";

const VALID = {
  type: "table",
  columns: ["Name", "Status"],
  rows: [
    ["alpha", "ok"],
    ["beta", "failed"],
  ],
};

describe("parseA2uiBlock — accepts", () => {
  it("a well-formed table", () => {
    const result = parseA2uiBlock(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.block.columns).toEqual(["Name", "Status"]);
    expect(result.block.rows).toEqual([
      ["alpha", "ok"],
      ["beta", "failed"],
    ]);
  });

  it("an empty row set (an empty table is legitimate)", () => {
    const result = parseA2uiBlock({ ...VALID, rows: [] });
    expect(result.ok).toBe(true);
  });

  it("numbers and booleans coerced to text cells", () => {
    const result = parseA2uiBlock({
      type: "table",
      columns: ["n", "b"],
      rows: [[42, true]],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.block.rows[0]).toEqual(["42", "true"]);
  });

  it("null as an explicit empty cell", () => {
    const result = parseA2uiBlock({
      type: "table",
      columns: ["a"],
      rows: [[null]],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.block.rows[0]).toEqual([""]);
  });

  it("an optional caption", () => {
    const result = parseA2uiBlock({ ...VALID, caption: "Results" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.block.caption).toBe("Results");
  });
});

describe("parseA2uiBlock — rejects", () => {
  it("a non-object", () => {
    expect(parseA2uiBlock(null).ok).toBe(false);
    expect(parseA2uiBlock("table").ok).toBe(false);
    expect(parseA2uiBlock([]).ok).toBe(false);
  });

  it("an unknown block type (the union is closed)", () => {
    const result = parseA2uiBlock({ ...VALID, type: "chart" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("unsupported block type");
  });

  it("an unexpected field, so a model learns the shape", () => {
    // This is how `html`, `onClick` or `style` would arrive. Refusing beats
    // ignoring: a silent drop teaches the model nothing.
    const result = parseA2uiBlock({ ...VALID, html: "<b>x</b>" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("unexpected field");
  });

  it("a row whose width disagrees with the columns", () => {
    const result = parseA2uiBlock({
      type: "table",
      columns: ["a", "b"],
      rows: [["only-one"]],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("expected 2");
  });

  it("an object or array as a cell (no '[object Object]' in a table)", () => {
    expect(
      parseA2uiBlock({ type: "table", columns: ["a"], rows: [[{ x: 1 }]] }).ok,
    ).toBe(false);
    expect(
      parseA2uiBlock({ type: "table", columns: ["a"], rows: [[[1, 2]]] }).ok,
    ).toBe(false);
  });

  it("oversized content instead of silently truncating it", () => {
    // A truncated table is a WRONG table, so this is a rejection, not a clip.
    expect(
      parseA2uiBlock({
        type: "table",
        columns: Array.from({ length: A2UI_MAX_COLUMNS + 1 }, (_, i) => `c${i}`),
        rows: [],
      }).ok,
    ).toBe(false);
    expect(
      parseA2uiBlock({
        type: "table",
        columns: ["a"],
        rows: Array.from({ length: A2UI_MAX_ROWS + 1 }, () => ["x"]),
      }).ok,
    ).toBe(false);
    expect(
      parseA2uiBlock({
        type: "table",
        columns: ["a"],
        rows: [["x".repeat(A2UI_MAX_CELL_CHARS + 1)]],
      }).ok,
    ).toBe(false);
  });
});

describe("A2uiBlock — rendering", () => {
  it("renders headers, cells and caption", () => {
    render(
      <A2uiBlock
        block={{
          type: "table",
          columns: ["Name", "Status"],
          rows: [["alpha", "ok"]],
          caption: "Results",
        }}
      />,
    );
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "alpha" })).toBeInTheDocument();
  });

  it("renders agent-supplied markup as text, not as markup", () => {
    const { container } = render(
      <A2uiBlock
        block={{
          type: "table",
          columns: ["payload"],
          rows: [['<script>alert("xss")</script>']],
        }}
      />,
    );
    // The literal characters survive...
    expect(container.textContent).toContain('<script>alert("xss")</script>');
    // ...and no element was created from them.
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
