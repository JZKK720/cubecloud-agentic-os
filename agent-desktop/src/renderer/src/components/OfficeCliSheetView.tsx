import { useEffect, useRef, useState } from "react";
import "@univerjs/preset-sheets-core/lib/index.css";
import { parseOfficeCliTextJson, type OfficeCliTextView } from "../../../shared/officecli-text";

/**
 * Read-only Univer grid fed by `officecli view <file> text --json`.
 * OfficeCLI stays the only writer; this can only display what it reports.
 */
export interface OfficeCliSheetViewProps {
  /** Raw stdout of `officecli view <file> text --json`. */
  json: string | null;
  loading?: boolean;
  error?: string | null;
}

const MAX_GRID_ROWS = 200;
const MAX_GRID_COLS = 40;

export function OfficeCliSheetView({
  json,
  loading = false,
  error = null,
}: OfficeCliSheetViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "mounting" | "ready" | "failed">("idle");
  const [mountError, setMountError] = useState<string | null>(null);

  const view: OfficeCliTextView = json
    ? parseOfficeCliTextJson(json)
    : { fileName: "", sheets: [] };
  const sheet = view.sheets[0] ?? null;

  useEffect(() => {
    const host = containerRef.current;
    if (!host || !sheet) return;

    let cancelled = false;
    let univer: { dispose(): void } | null = null;
    setStatus("mounting");
    setMountError(null);

    void (async () => {
      try {
        const [{ createUniver, LocaleType }, { UniverSheetsCorePreset }, locale] =
          await Promise.all([
            import("@univerjs/presets"),
            import("@univerjs/preset-sheets-core"),
            import("@univerjs/preset-sheets-core/lib/es/locales/en-US.js"),
          ]);
        if (cancelled || !containerRef.current) return;

        host.replaceChildren();

        const { univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: { "en-US": locale.default },
          presets: [
            UniverSheetsCorePreset({
              container: host,
              header: false,
              footer: false,
              toolbar: false,
              formulaBar: false,
              contextMenu: false,
            }),
          ],
        });

        const maxRow = sheet.cells.reduce((m, c) => Math.max(m, c.row + 1), 0);
        const maxCol = sheet.cells.reduce((m, c) => Math.max(m, c.column + 1), 0);
        const rowCount = Math.min(Math.max(maxRow + 10, 20), MAX_GRID_ROWS);
        const columnCount = Math.min(Math.max(maxCol + 2, 6), MAX_GRID_COLS);

        const cellData: Record<number, Record<number, { v: string | number }>> = {};
        for (const cell of sheet.cells) {
          if (cell.row >= MAX_GRID_ROWS || cell.column >= MAX_GRID_COLS) continue;
          (cellData[cell.row] ??= {})[cell.column] = {
            v: cell.numberValue ?? cell.value,
          };
        }

        univerAPI.createWorkbook({
          id: "officecli-sheet",
          name: sheet.name || "Sheet",
          appVersion: "1.6.1",
          locale: LocaleType.EN_US,
          styles: {},
          sheetOrder: ["sheet-1"],
          sheets: {
            "sheet-1": {
              id: "sheet-1",
              name: sheet.name || "Sheet1",
              rowCount,
              columnCount,
              cellData,
              tabColor: "",
              hidden: 0,
              freeze: { xSplit: 0, ySplit: 1, startRow: 1, startColumn: 0 },
              zoomRatio: 1,
              scrollTop: 0,
              scrollLeft: 0,
              defaultColumnWidth: 100,
              defaultRowHeight: 24,
              mergeData: [],
              rowData: {},
              columnData: {},
              rowHeader: { width: 46 },
              columnHeader: { height: 20 },
              showGridlines: 1,
              rightToLeft: 0,
            },
          },
        });

        univer = { dispose: () => univerAPI.dispose() };
        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setMountError(err instanceof Error ? err.message : String(err));
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
      try {
        univer?.dispose();
      } catch {
        /* Univer does not guarantee dispose on every path; ignore. */
      }
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  }, [sheet]);

  if (loading) {
    return <div className="officecli-sheet-view-state">Loading preview…</div>;
  }
  if (error) {
    return <div className="officecli-sheet-view-state officecli-sheet-view-error">{error}</div>;
  }
  if (!sheet) {
    return (
      <div className="officecli-sheet-view-state">
        Run <code>officecli view &lt;file&gt; text --json</code> for a spreadsheet to preview it here.
      </div>
    );
  }
  if (mountError) {
    return <div className="officecli-sheet-view-state officecli-sheet-view-error">{mountError}</div>;
  }

  return (
    <div className="officecli-sheet-view">
      <div className="officecli-sheet-view-meta">
        {view.fileName ? <span className="officecli-sheet-view-file">{view.fileName}</span> : null}
        <span className="officecli-sheet-view-sheet">
          {sheet.name} · {sheet.cells.length} cells
        </span>
        <span className="officecli-sheet-view-status">{status}</span>
      </div>
      <div className="officecli-sheet-view-host" ref={containerRef} />
    </div>
  );
}
