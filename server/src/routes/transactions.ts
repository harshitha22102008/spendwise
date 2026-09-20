import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

const TYPES = new Set(["income", "expense"]);

type TransactionWithCategory = {
  id: string;
  amount: number;
  type: string;
  date: Date;
  note: string | null;
  categoryId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    kind: string;
    color: string | null;
  };
};

function publicTransaction(tx: TransactionWithCategory) {
  return {
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    date: tx.date,
    note: tx.note,
    categoryId: tx.categoryId,
    userId: tx.userId,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    category: {
      id: tx.category.id,
      name: tx.category.name,
      kind: tx.category.kind,
      color: tx.category.color,
    },
  };
}

const transactionInclude = {
  category: {
    select: { id: true, name: true, kind: true, color: true },
  },
} as const;

function isType(value: unknown): value is "income" | "expense" {
  return typeof value === "string" && TYPES.has(value);
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseOptionalDateBound(
  value: unknown,
  endOfDay: boolean,
): Date | null | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  // Accept YYYY-MM-DD or full ISO
  const d = new Date(raw.includes("T") ? raw : `${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay && !raw.includes("T")) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
}

function queryString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : String(value);
}

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/** GET /api/transactions — list with optional type, categoryId, from, to */
transactionsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const typeRaw = queryString(req.query.type);
    const categoryId = queryString(req.query.categoryId);
    const from = parseOptionalDateBound(req.query.from, false);
    const to = parseOptionalDateBound(req.query.to, true);

    if (typeRaw !== undefined && !isType(typeRaw)) {
      res.status(400).json({ error: "type must be income or expense" });
      return;
    }
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
      type?: string;
      categoryId?: string;
      date?: { gte?: Date; lte?: Date };
    } = { userId: req.userId! };

    if (typeRaw !== undefined) where.type = typeRaw;
    if (categoryId !== undefined && categoryId.trim().length > 0) {
      where.categoryId = categoryId.trim();
    }
    if (from !== undefined || to !== undefined) {
      where.date = {};
      if (from !== undefined) where.date.gte = from;
      if (to !== undefined) where.date.lte = to;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    res.json({ transactions: transactions.map(publicTransaction) });
  } catch (err) {
    console.error("list transactions failed", err);
    res.status(500).json({ error: "Failed to load transactions" });
  }
});

/** POST /api/transactions — create income or expense */
transactionsRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { categoryId, amount, type, date, note } = req.body ?? {};

    if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
      res.status(400).json({ error: "categoryId is required" });
      return;
    }
    if (!isType(type)) {
      res.status(400).json({ error: "type must be income or expense" });
      return;
    }
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) {
      res.status(400).json({ error: "amount must be a positive number" });
      return;
    }
    const txDate = parseDate(date);
    if (!txDate) {
      res.status(400).json({ error: "Valid date is required (ISO string)" });
      return;
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId.trim(), userId: req.userId },
    });
    if (!category) {
      res.status(400).json({ error: "Category not found or not yours" });
      return;
    }
    if (category.kind !== type) {
      res.status(400).json({
        error: `Category kind (${category.kind}) must match transaction type (${type})`,
      });
      return;
    }

    const transaction = await prisma.transaction.create({
      data: {
        categoryId: category.id,
        userId: req.userId!,
        amount: parsedAmount,
        type,
        date: txDate,
        note:
          typeof note === "string" && note.trim().length > 0
            ? note.trim()
            : null,
      },
      include: transactionInclude,
    });

    res.status(201).json({ transaction: publicTransaction(transaction) });
  } catch (err) {
    console.error("create transaction failed", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

/** PATCH /api/transactions/:id — update own transaction */
transactionsRouter.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const id = paramId(req.params.id);
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const { categoryId, amount, type, date, note } = req.body ?? {};
    const data: {
      categoryId?: string;
      amount?: number;
      type?: string;
      date?: Date;
      note?: string | null;
    } = {};

    if (type !== undefined) {
      if (!isType(type)) {
        res.status(400).json({ error: "type must be income or expense" });
        return;
      }
      data.type = type;
    }

    if (categoryId !== undefined) {
      if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
        res.status(400).json({ error: "categoryId cannot be empty" });
        return;
      }
      const category = await prisma.category.findFirst({
        where: { id: categoryId.trim(), userId: req.userId },
      });
      if (!category) {
        res.status(400).json({ error: "Category not found or not yours" });
        return;
      }
      const nextType = data.type ?? existing.type;
      if (category.kind !== nextType) {
        res.status(400).json({
          error: `Category kind (${category.kind}) must match transaction type (${nextType})`,
        });
        return;
      }
      data.categoryId = category.id;
    } else if (data.type !== undefined && data.type !== existing.type) {
      const category = await prisma.category.findFirst({
        where: { id: existing.categoryId, userId: req.userId },
      });
      if (!category || category.kind !== data.type) {
        res.status(400).json({
          error:
            "Changing type requires a category whose kind matches the new type",
        });
        return;
      }
    }

    if (amount !== undefined) {
      const parsedAmount = parseAmount(amount);
      if (parsedAmount === null) {
        res.status(400).json({ error: "amount must be a positive number" });
        return;
      }
      data.amount = parsedAmount;
    }

    if (date !== undefined) {
      const txDate = parseDate(date);
      if (!txDate) {
        res.status(400).json({ error: "Valid date is required (ISO string)" });
        return;
      }
      data.date = txDate;
    }

    if (note !== undefined) {
      data.note =
        typeof note === "string" && note.trim().length > 0
          ? note.trim()
          : null;
    }

    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data,
      include: transactionInclude,
    });

    res.json({ transaction: publicTransaction(transaction) });
  } catch (err) {
    console.error("update transaction failed", err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

/** DELETE /api/transactions/:id — delete own transaction */
transactionsRouter.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = paramId(req.params.id);
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    await prisma.transaction.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    console.error("delete transaction failed", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});
