/** Shared CSV columns for export and import (order matters). */
export const CSV_COLUMNS = ["date", "type", "category", "amount", "note"] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

export type CsvRow = {
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
};

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: CsvRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((row) =>
    [
      escapeCell(row.date),
      escapeCell(row.type),
      escapeCell(row.category),
      escapeCell(String(row.amount)),
      escapeCell(row.note),
    ].join(","),
  );
  return [header, ...lines].join("\n") + (lines.length ? "\n" : "");
}

/** Minimal RFC4180-ish line splitter for small demo files. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

export type ParseCsvResult =
  | { ok: true; rows: CsvRow[] }
  | { ok: false; error: string };

export function parseCsv(text: string): ParseCsvResult {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) {
    return { ok: false, error: "CSV is empty" };
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 1) {
    return { ok: false, error: "CSV is empty" };
  }

  const headerCells = splitCsvLine(lines[0]).map(normalizeHeader);
  if (headerCells.length !== CSV_COLUMNS.length) {
    return {
      ok: false,
      error: `Header must be exactly: ${CSV_COLUMNS.join(",")}`,
    };
  }
  for (let i = 0; i < CSV_COLUMNS.length; i++) {
    if (headerCells[i] !== CSV_COLUMNS[i]) {
      return {
        ok: false,
        error: `Header must be exactly: ${CSV_COLUMNS.join(",")}`,
      };
    }
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length !== CSV_COLUMNS.length) {
      return {
        ok: false,
        error: `Row ${i + 1}: expected ${CSV_COLUMNS.length} columns`,
      };
    }

    const date = cells[0].trim();
    const typeRaw = cells[1].trim().toLowerCase();
    const category = cells[2].trim();
    const amountRaw = cells[3].trim();
    const note = cells[4].trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        ok: false,
        error: `Row ${i + 1}: date must be YYYY-MM-DD`,
      };
    }
    if (typeRaw !== "income" && typeRaw !== "expense") {
      return {
        ok: false,
        error: `Row ${i + 1}: type must be income or expense`,
      };
    }
    if (!category) {
      return { ok: false, error: `Row ${i + 1}: category is required` };
    }
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        error: `Row ${i + 1}: amount must be a positive number`,
      };
    }

    rows.push({
      date,
      type: typeRaw,
      category,
      amount,
      note,
    });
  }

  return { ok: true, rows };
}
