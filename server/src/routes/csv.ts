import { Router } from "express";
import { parseCsv, rowsToCsv, type CsvRow } from "../lib/csv.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const csvRouter = Router();

csvRouter.use(requireAuth);

function queryString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : String(value);
}

function parseOptionalDateBound(
  value: unknown,
  endOfDay: boolean,
): Date | null | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  const d = new Date(raw.includes("T") ? raw : `${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay && !raw.includes("T")) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/csv/export?from=&to=
 * Download owner transactions as CSV (same columns as import).
 */
csvRouter.get("/export", async (req: AuthRequest, res) => {
  try {
    const from = parseOptionalDateBound(req.query.from, false);
    const to = parseOptionalDateBound(req.query.to, true);
    if (from === null) {
      res.status(400).json({ error: "from must be a valid date" });
      return;
    }
    if (to === null) {
      res.status(400).json({ error: "to must be a valid date" });
      return;
    }

    const where: {
      userId: string;
      date?: { gte?: Date; lte?: Date };
    } = { userId: req.userId! };

    if (from !== undefined || to !== undefined) {
      where.date = {};
      if (from !== undefined) where.date.gte = from;
      if (to !== undefined) where.date.lte = to;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    const rows: CsvRow[] = transactions.map((tx) => ({
      date: dayKey(tx.date),
      type: tx.type as "income" | "expense",
      category: tx.category.name,
      amount: tx.amount,
      note: tx.note ?? "",
    }));

    const csv = rowsToCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="spendwise-transactions-${stamp}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    console.error("csv export failed", err);
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

/**
 * POST /api/csv/import
 * Body: { csv: string } — same columns as export. Creates missing categories.
 */
csvRouter.post("/import", async (req: AuthRequest, res) => {
  try {
    const csvText = req.body?.csv;
    if (typeof csvText !== "string") {
      res.status(400).json({ error: "csv string is required in body" });
      return;
    }

    const parsed = parseCsv(csvText);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    if (parsed.rows.length === 0) {
      res.status(400).json({ error: "CSV has a header but no data rows" });
      return;
    }

    const userId = req.userId!;
    let created = 0;
    let categoriesCreated = 0;

    // Cache categories by kind:name
    const existing = await prisma.category.findMany({ where: { userId } });
    const catMap = new Map(
      existing.map((c) => [`${c.kind}:${c.name.toLowerCase()}`, c]),
    );

    for (const row of parsed.rows) {
      const key = `${row.type}:${row.category.toLowerCase()}`;
      let category = catMap.get(key);
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: row.category,
            kind: row.type,
            userId,
          },
        });
        catMap.set(key, category);
        categoriesCreated += 1;
      }

      await prisma.transaction.create({
        data: {
          userId,
          categoryId: category.id,
          amount: row.amount,
          type: row.type,
          date: new Date(`${row.date}T00:00:00.000Z`),
          note: row.note.length > 0 ? row.note : null,
        },
      });
      created += 1;
    }

    res.status(201).json({
      imported: created,
      categoriesCreated,
      columns: ["date", "type", "category", "amount", "note"],
    });
  } catch (err) {
    console.error("csv import failed", err);
    res.status(500).json({ error: "Failed to import CSV" });
  }
});
