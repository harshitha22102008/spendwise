import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const summaryRouter = Router();

summaryRouter.use(requireAuth);

function queryString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : String(value);
}

function parseYearMonth(
  yearRaw: unknown,
  monthRaw: unknown,
): { year: number; month: number } | null {
  const yearStr = queryString(yearRaw);
  const monthStr = queryString(monthRaw);
  const now = new Date();
  const year = yearStr !== undefined ? Number(yearStr) : now.getFullYear();
  const month =
    monthStr !== undefined ? Number(monthStr) : now.getMonth() + 1;

  if (
    !Number.isInteger(year) ||
    year < 1970 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return { year, month };
}

function monthBounds(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { from, to };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * GET /api/summary/month?year=&month=
 * Owner-scoped monthly totals, spend by category, and daily income/expense series.
 */
summaryRouter.get("/month", async (req: AuthRequest, res) => {
  try {
    const parsed = parseYearMonth(req.query.year, req.query.month);
    if (!parsed) {
      res.status(400).json({
        error: "year and month must be valid (month 1–12)",
      });
      return;
    }

    const { year, month } = parsed;
    const { from, to } = monthBounds(year, month);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId!,
        date: { gte: from, lte: to },
      },
      include: {
        category: { select: { id: true, name: true, kind: true, color: true } },
      },
      orderBy: { date: "asc" },
    });

    let incomeTotal = 0;
    let expenseTotal = 0;
    const byCategoryMap = new Map<
      string,
      {
        categoryId: string;
        name: string;
        type: string;
        amount: number;
        color: string | null;
      }
    >();
    const byDayMap = new Map<
      string,
      { date: string; income: number; expense: number }
    >();

    const dayCount = daysInMonth(year, month);
    for (let day = 1; day <= dayCount; day++) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      byDayMap.set(date, { date, income: 0, expense: 0 });
    }

    for (const tx of transactions) {
      const key = dayKey(tx.date);
      const dayBucket = byDayMap.get(key);
      if (dayBucket) {
        if (tx.type === "income") dayBucket.income += tx.amount;
        else dayBucket.expense += tx.amount;
      }

      if (tx.type === "income") incomeTotal += tx.amount;
      else expenseTotal += tx.amount;

      if (tx.type === "expense") {
        const existing = byCategoryMap.get(tx.categoryId);
        if (existing) {
          existing.amount += tx.amount;
        } else {
          byCategoryMap.set(tx.categoryId, {
            categoryId: tx.categoryId,
            name: tx.category.name,
            type: tx.type,
            amount: tx.amount,
            color: tx.category.color,
          });
        }
      }
    }

    const byCategory = [...byCategoryMap.values()]
      .map((row) => ({
        ...row,
        amount: Math.round(row.amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    const byDay = [...byDayMap.values()].map((row) => ({
      date: row.date,
      income: Math.round(row.income * 100) / 100,
      expense: Math.round(row.expense * 100) / 100,
    }));

    res.json({
      year,
      month,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        income: Math.round(incomeTotal * 100) / 100,
        expense: Math.round(expenseTotal * 100) / 100,
        net: Math.round((incomeTotal - expenseTotal) * 100) / 100,
      },
      byCategory,
      byDay,
      transactionCount: transactions.length,
    });
  } catch (err) {
    console.error("monthly summary failed", err);
    res.status(500).json({ error: "Failed to load monthly summary" });
  }
});
