import { describe, expect, it } from "vitest";
import {
  parseOfficeCliTextJson,
  parseA1,
  columnNameToIndex,
} from "../src/shared/officecli-text";

const SAMPLE = JSON.stringify({
  success: true,
  data: {
    fileName: "b.xlsx",
    sheets: [
      {
        name: "Sheet1",
        totalRows: 2,
        rows: [
          { row: 1, cells: { A1: "42", C1: "84" } },
          { row: 2, cells: { B2: "hello" } },
        ],
      },
    ],
  },
});

describe("columnNameToIndex", () => {
  it("maps single letters A-Z", () => {
    expect(columnNameToIndex("A")).toBe(0);
    expect(columnNameToIndex("Z")).toBe(25);
  });
  it("maps multi-letter columns", () => {
    expect(columnNameToIndex("AA")).toBe(26);
    expect(columnNameToIndex("AZ")).toBe(51);
    expect(columnNameToIndex("BA")).toBe(52);
  });
});

describe("parseA1", () => {
  it("decodes valid refs", () => {
    expect(parseA1("A1")).toEqual({ row: 0, column: 0 });
    expect(parseA1("C1")).toEqual({ row: 0, column: 2 });
    expect(parseA1("B2")).toEqual({ row: 1, column: 1 });
  });
  it("rejects malformed refs", () => {
    expect(parseA1("1A")).toBeNull();
    expect(parseA1("")).toBeNull();
    expect(parseA1("A0")).toBeNull();
  });
});

describe("parseOfficeCliTextJson", () => {
  it("normalises a real officecli text --json payload", () => {
    const parsed = parseOfficeCliTextJson(SAMPLE);
    expect(parsed.fileName).toBe("b.xlsx");
    expect(parsed.sheets).toHaveLength(1);
    const cell1 = parsed.sheets[0].cells.find((c) => c.a1 === "A1");
    expect(cell1).toBeDefined();
    expect(cell1?.row).toBe(0);
    expect(cell1?.column).toBe(0);
    expect(cell1?.value).toBe("42");
    expect(cell1?.numberValue).toBe(42);
    const txt = parsed.sheets[0].cells.find((c) => c.a1 === "B2");
    expect(txt?.value).toBe("hello");
    expect(txt?.numberValue).toBeNull();
  });

  it("returns empty structure on garbage rather than throwing", () => {
    expect(parseOfficeCliTextJson("not json")).toEqual({ fileName: "", sheets: [] });
    expect(parseOfficeCliTextJson("{}").sheets).toEqual([]);
  });

  it("skips cells with unparseable refs instead of inventing coordinates", () => {
    const bad = JSON.stringify({
      success: true,
      data: {
        sheets: [
          {
            name: "S",
            totalRows: 1,
            rows: [{ row: 1, cells: { "nope!!": "x", "C3": "ok" } }],
          },
        ],
      },
    });
    const parsed = parseOfficeCliTextJson(bad);
    expect(parsed.sheets[0].cells).toHaveLength(1);
    expect(parsed.sheets[0].cells[0].a1).toBe("C3");
  });
});
