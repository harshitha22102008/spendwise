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
    <section className="mt-12">
      <h2 className="font-display text-2xl">CSV import / export</h2>
      <p className="mt-1 text-sm text-muted">
        Same columns both ways:{" "}
        <code className="rounded bg-accent-soft px-1.5 py-0.5 text-xs text-ink">
          {CSV_COLUMNS}
        </code>
        . Categories are matched by name and type; missing ones are created on
        import.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-ink">Export</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink">From (optional)</span>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink">To (optional)</span>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={onExport}
              className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-accent-soft disabled:opacity-60"
            >
              {busy ? "Working…" : "Download CSV"}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-ink">Import</h3>
          <p className="mt-1 text-sm text-muted">
            Choose a <code className="text-xs">.csv</code> file with the header
            above. Dates use YYYY-MM-DD; type is income or expense.
          </p>
          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={onFileChange}
              className="block w-full text-sm text-muted file:mr-3 file:h-10 file:rounded-[var(--radius-sm)] file:border file:border-border file:bg-surface file:px-4 file:text-sm file:font-medium file:text-ink hover:file:bg-accent-soft disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-[var(--success)]" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
