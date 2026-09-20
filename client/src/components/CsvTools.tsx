import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiDownload, apiPost } from "../lib/api";

const CSV_COLUMNS = "date,type,category,amount,note";

type Props = {
  onImported: () => Promise<void>;
  onError: (message: string) => void;
};

export function CsvTools({ onImported, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onExport() {
    setBusy(true);
    setMessage(null);
    onError("");
    try {
      const params = new URLSearchParams();
      if (exportFrom) params.set("from", exportFrom);
      if (exportTo) params.set("to", exportTo);
      const qs = params.toString();
      const path = qs ? `/api/csv/export?${qs}` : "/api/csv/export";
      await apiDownload(path, "spendwise-transactions.csv");
      setMessage("Export downloaded.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function importText(csv: string) {
    setBusy(true);
    setMessage(null);
    onError("");
    try {
      const data = await apiPost<{
        imported: number;
        categoriesCreated: number;
      }>("/api/csv/import", { csv }, true);
      setMessage(
        `Imported ${data.imported} transaction${data.imported === 1 ? "" : "s"}` +
          (data.categoriesCreated
            ? ` (created ${data.categoriesCreated} categor${data.categoriesCreated === 1 ? "y" : "ies"}).`
            : "."),
      );
      await onImported();
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      onError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFileChange(e: FormEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importText(text);
  }

  return (
    <section className="sw-panel sw-panel-hover mt-3 p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">
        CSV import / export
      </h2>
      <p className="mt-0.5 text-xs text-muted">
        Same columns both ways:{" "}
        <code className="rounded-[var(--radius-sm)] bg-accent-soft px-1.5 py-0.5 font-mono text-[0.7rem] text-ink">
          {CSV_COLUMNS}
        </code>
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Export
          </h3>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-ink">From</span>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="sw-input"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-ink">To</span>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="sw-input"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={onExport}
              className="sw-btn sw-btn-ghost disabled:opacity-60"
            >
              {busy ? "Working…" : "Download CSV"}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Import
          </h3>
          <p className="mt-1 text-xs text-muted">
            Header required. Dates YYYY-MM-DD; type income or expense. Missing
            categories are created.
          </p>
          <div className="mt-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={onFileChange}
              className="block w-full text-xs text-muted file:mr-3 file:h-9 file:cursor-pointer file:rounded-[var(--radius-sm)] file:border file:border-border file:bg-surface file:px-3 file:text-xs file:font-semibold file:text-ink hover:file:bg-accent-soft disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-3 text-sm font-medium text-income" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
