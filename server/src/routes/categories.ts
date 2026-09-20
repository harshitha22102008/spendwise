import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

const KINDS = new Set(["income", "expense"]);

function publicCategory(category: {
  id: string;
  name: string;
  kind: string;
  color: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    color: category.color,
    userId: category.userId,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isKind(value: unknown): value is "income" | "expense" {
  return typeof value === "string" && KINDS.has(value);
}

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/** GET /api/categories — list current user's categories (optional ?kind=) */
categoriesRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const kindRaw = req.query.kind;
    const where: { userId: string; kind?: string } = { userId: req.userId! };

    if (kindRaw !== undefined) {
      const kind = Array.isArray(kindRaw) ? kindRaw[0] : kindRaw;
      if (!isKind(kind)) {
        res.status(400).json({ error: "kind must be income or expense" });
        return;
      }
      where.kind = kind;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    });
    res.json({ categories: categories.map(publicCategory) });
  } catch (err) {
    console.error("list categories failed", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

/** POST /api/categories — create category */
categoriesRouter.post("/", async (req: AuthRequest, res) => {
  try {
    const { name, kind, color } = req.body ?? {};

    if (!isNonEmptyString(name)) {
      res.status(400).json({ error: "Category name is required" });
      return;
    }
    if (!isKind(kind)) {
      res.status(400).json({ error: "kind must be income or expense" });
      return;
    }

    const trimmedName = name.trim();
    const existing = await prisma.category.findFirst({
      where: {
        userId: req.userId!,
        name: trimmedName,
        kind,
      },
    });
    if (existing) {
      res.status(409).json({
        error: "A category with this name and kind already exists",
      });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        kind,
        color:
          typeof color === "string" && color.trim().length > 0
            ? color.trim()
            : null,
        userId: req.userId!,
      },
    });

    res.status(201).json({ category: publicCategory(category) });
  } catch (err) {
    console.error("create category failed", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

/** PATCH /api/categories/:id — update own category */
categoriesRouter.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const id = paramId(req.params.id);
    const existing = await prisma.category.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const { name, kind, color } = req.body ?? {};
    const data: { name?: string; kind?: string; color?: string | null } = {};

    if (name !== undefined) {
      if (!isNonEmptyString(name)) {
        res.status(400).json({ error: "Category name cannot be empty" });
        return;
      }
      data.name = name.trim();
    }
    if (kind !== undefined) {
      if (!isKind(kind)) {
        res.status(400).json({ error: "kind must be income or expense" });
        return;
      }
      data.kind = kind;
    }
    if (color !== undefined) {
      data.color =
        typeof color === "string" && color.trim().length > 0
          ? color.trim()
          : null;
    }

    const nextName = data.name ?? existing.name;
    const nextKind = data.kind ?? existing.kind;
    if (nextName !== existing.name || nextKind !== existing.kind) {
      const clash = await prisma.category.findFirst({
        where: {
          userId: req.userId!,
          name: nextName,
          kind: nextKind,
          NOT: { id: existing.id },
        },
      });
      if (clash) {
        res.status(409).json({
          error: "A category with this name and kind already exists",
        });
        return;
      }
    }

    const category = await prisma.category.update({
      where: { id: existing.id },
      data,
    });

    res.json({ category: publicCategory(category) });
  } catch (err) {
    console.error("update category failed", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

/** DELETE /api/categories/:id — delete own category (blocked if used) */
categoriesRouter.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = paramId(req.params.id);
    const existing = await prisma.category.findFirst({
      where: { id, userId: req.userId },
      include: { _count: { select: { transactions: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    if (existing._count.transactions > 0) {
      res.status(409).json({
        error: "Cannot delete a category that still has transactions",
      });
      return;
    }

    await prisma.category.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    console.error("delete category failed", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});
