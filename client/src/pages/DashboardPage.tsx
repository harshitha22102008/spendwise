import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { clearAuth, getStoredUser, type AuthUser } from "../lib/auth";
import type {
  Category,
  CategoryKind,
  Transaction,
  TransactionType,
} from "../lib/types";

function todayISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTxDate(iso: string): string {
  return iso.slice(0, 10);
}

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<CategoryKind>("expense");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<CategoryKind>("expense");

  const [txType, setTxType] = useState<TransactionType>("expense");
  const [txCategoryId, setTxCategoryId] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(todayISODate());
  const [txNote, setTxNote] = useState("");
  const [txBusy, setTxBusy] = useState(false);

  const [filterType, setFilterType] = useState<"" | TransactionType>("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const categoriesForTx = useMemo(
    () => categories.filter((c) => c.kind === txType),
    [categories, txType],
  );

  async function loadCategories() {
    const data = await apiGet<{ categories: Category[] }>(
      "/api/categories",
      true,
    );
    setCategories(data.categories);
    return data.categories;
  }

  async function loadTransactions(filters?: {
    type?: string;
    categoryId?: string;
    from?: string;
    to?: string;
  }) {
    const params = new URLSearchParams();
    const type = filters?.type ?? filterType;
    const categoryId = filters?.categoryId ?? filterCategoryId;
    const from = filters?.from ?? filterFrom;
    const to = filters?.to ?? filterTo;
    if (type) params.set("type", type);
    if (categoryId) params.set("categoryId", categoryId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    const path = qs ? `/api/transactions?${qs}` : "/api/transactions";
    const data = await apiGet<{ transactions: Transaction[] }>(path, true);
    setTransactions(data.transactions);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ user: AuthUser }>("/api/auth/me", true);
        if (cancelled) return;
        setUser(data.user);
        const cats = await loadCategories();
        await loadTransactions();
        if (cancelled) return;
        const expenseCats = cats.filter((c) => c.kind === "expense");
        setTxCategoryId(expenseCats[0]?.id ?? cats[0]?.id ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Session expired");
          clearAuth();
          navigate("/login", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, [navigate]);

  useEffect(() => {
    setTxCategoryId((prev) => {
      if (prev && categoriesForTx.some((c) => c.id === prev)) return prev;
      return categoriesForTx[0]?.id ?? "";
    });
  }, [categoriesForTx]);

  function logout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  async function onCreateCategory(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCategoryBusy(true);
    try {
      const data = await apiPost<{ category: Category }>(
        "/api/categories",
        { name: categoryName, kind: categoryKind },
        true,
      );
      setCategories((prev) =>
        [...prev, data.category].sort(
          (a, b) =>
            a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name),
        ),
      );
      setCategoryName("");
      if (!txCategoryId && data.category.kind === txType) {
        setTxCategoryId(data.category.id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category",
      );
    } finally {
      setCategoryBusy(false);
    }
  }

  async function onSaveCategory(id: string) {
    setError(null);
    setCategoryBusy(true);
    try {
      const data = await apiPatch<{ category: Category }>(
        `/api/categories/${id}`,
        { name: editName, kind: editKind },
        true,
      );
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? data.category : c))
          .sort(
            (a, b) =>
              a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name),
          ),
      );
      setTransactions((prev) =>
        prev.map((t) =>
          t.categoryId === id
            ? {
                ...t,
                category: {
                  id: data.category.id,
                  name: data.category.name,
                  kind: data.category.kind,
                  color: data.category.color,
                },
              }
            : t,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category",
      );
    } finally {
      setCategoryBusy(false);
    }
  }

  async function onDeleteCategory(id: string) {
    if (!window.confirm("Delete this category?")) return;
    setError(null);
    setCategoryBusy(true);
    try {
      await apiDelete(`/api/categories/${id}`, true);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) setEditingId(null);
      if (txCategoryId === id) setTxCategoryId("");
      if (filterCategoryId === id) setFilterCategoryId("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    } finally {
      setCategoryBusy(false);
    }
  }

  async function onCreateTransaction(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setTxBusy(true);
    try {
      await apiPost<{ transaction: Transaction }>(
        "/api/transactions",
        {
          categoryId: txCategoryId,
          amount: Number(txAmount),
          type: txType,
          date: txDate,
          note: txNote.trim() || undefined,
        },
        true,
      );
      await loadTransactions();
      setTxAmount("");
      setTxNote("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add transaction",
      );
    } finally {
      setTxBusy(false);
    }
  }

  async function onDeleteTransaction(id: string) {
    if (!window.confirm("Delete this transaction?")) return;
    setError(null);
    try {
      await apiDelete(`/api/transactions/${id}`, true);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete transaction",
      );
    }
  }

  async function onApplyFilters(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await loadTransactions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to filter transactions",
      );
    }
  }

  async function onClearFilters() {
    setFilterType("");
    setFilterCategoryId("");
    setFilterFrom("");
    setFilterTo("");
    setError(null);
    try {
      await loadTransactions({
        type: "",
        categoryId: "",
        from: "",
        to: "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transactions",
      );
    }
  }

  const incomeCount = categories.filter((c) => c.kind === "income").length;
  const expenseCount = categories.filter((c) => c.kind === "expense").length;
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-[var(--nav-h)] max-w-[68rem] items-center justify-between px-6">
          <Link
            to="/dashboard"
            className="font-display text-lg font-semibold text-ink"
          >
            SpendWise
          </Link>
          <button
            type="button"
            onClick={logout}
            className="h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm font-medium text-ink transition hover:bg-accent-soft"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[68rem] px-6 py-10">
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="mt-2 max-w-xl text-muted">
            Signed in
            {user?.name
              ? ` as ${user.name}`
              : user?.email
                ? ` as ${user.email}`
                : ""}
            . Manage categories and log income or expenses.
          </p>

          {error ? (
            <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-8 text-sm text-muted">Loading…</p>
          ) : (
            <>
              <div className="mt-8 flex flex-wrap gap-6 text-sm">
                <p>
                  <span className="text-muted">Categories</span>{" "}
                  <span className="font-medium text-ink">
                    {categories.length}
                  </span>
                </p>
                <p>
                  <span className="text-muted">Income cats</span>{" "}
                  <span className="font-medium text-ink">{incomeCount}</span>
                </p>
                <p>
                  <span className="text-muted">Expense cats</span>{" "}
                  <span className="font-medium text-ink">{expenseCount}</span>
                </p>
                <p>
                  <span className="text-muted">Listed income</span>{" "}
                  <span className="font-medium text-[var(--success)]">
                    {formatMoney(totalIncome)}
                  </span>
                </p>
                <p>
                  <span className="text-muted">Listed expense</span>{" "}
                  <span className="font-medium text-[var(--danger)]">
                    {formatMoney(totalExpense)}
                  </span>
                </p>
              </div>

              <section className="mt-10">
                <h2 className="font-display text-2xl">Categories</h2>
                <p className="mt-1 text-sm text-muted">
                  Group income and spending so transactions stay organized.
                </p>

                <form
                  onSubmit={onCreateCategory}
                  className="mt-4 flex flex-wrap items-end gap-3"
                >
                  <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-sm">
                    <span className="font-medium text-ink">Name</span>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. Groceries"
                      className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                    />
                  </label>
                  <label className="flex min-w-[8rem] flex-col gap-1.5 text-sm">
                    <span className="font-medium text-ink">Kind</span>
                    <select
                      value={categoryKind}
                      onChange={(e) =>
                        setCategoryKind(e.target.value as CategoryKind)
                      }
                      className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={categoryBusy}
                    className="h-10 rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
                  >
                    {categoryBusy ? "Saving…" : "Add category"}
                  </button>
                </form>

                {categories.length === 0 ? (
                  <p className="mt-6 text-sm text-muted">
                    No categories yet. Add one to start tracking money.
                  </p>
                ) : (
                  <ul className="mt-6 divide-y divide-border border-y border-border">
                    {categories.map((category) => (
                      <li
                        key={category.id}
                        className="flex flex-wrap items-center gap-3 py-3"
                      >
                        {editingId === category.id ? (
                          <>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-9 min-w-[10rem] flex-1 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm"
                            />
                            <select
                              value={editKind}
                              onChange={(e) =>
                                setEditKind(e.target.value as CategoryKind)
                              }
                              className="h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm"
                            >
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                            </select>
                            <button
                              type="button"
                              disabled={categoryBusy}
                              onClick={() => onSaveCategory(category.id)}
                              className="h-9 rounded-[var(--radius-sm)] bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-sm"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 font-medium text-ink">
                              {category.name}
                            </span>
                            <span className="rounded-[var(--radius-sm)] bg-accent-soft px-2 py-0.5 text-xs font-medium capitalize text-accent">
                              {category.kind}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(category.id);
                                setEditName(category.name);
                                setEditKind(category.kind);
                              }}
                              className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-sm hover:bg-accent-soft"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCategory(category.id)}
                              className="h-9 rounded-[var(--radius-sm)] border border-border px-3 text-sm text-[var(--danger)] hover:bg-accent-soft"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="mt-12">
                <h2 className="font-display text-2xl">Transactions</h2>
                <p className="mt-1 text-sm text-muted">
                  Log income and expenses. Filter by type, category, or date.
                </p>

                {categories.length === 0 ? (
                  <p className="mt-6 text-sm text-muted">
                    Add a category before logging a transaction.
                  </p>
                ) : (
                  <form
                    onSubmit={onCreateTransaction}
                    className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                  >
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-ink">Type</span>
                      <select
                        value={txType}
                        onChange={(e) =>
                          setTxType(e.target.value as TransactionType)
                        }
                        className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-ink">Category</span>
                      <select
                        required
                        value={txCategoryId}
                        onChange={(e) => setTxCategoryId(e.target.value)}
                        className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                      >
                        {categoriesForTx.length === 0 ? (
                          <option value="">No matching categories</option>
                        ) : (
                          categoriesForTx.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-ink">Amount</span>
                      <input
                        type="number"
                        required
                        min={0.01}
                        step="0.01"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-ink">Date</span>
                      <input
                        type="date"
                        required
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium text-ink">
                        Note (optional)
                      </span>
                      <input
                        type="text"
                        maxLength={200}
                        value={txNote}
                        onChange={(e) => setTxNote(e.target.value)}
                        placeholder="Weekly groceries"
                        className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                      />
                    </label>
                    <div className="flex items-end sm:col-span-2 lg:col-span-5">
                      <button
                        type="submit"
                        disabled={
                          txBusy ||
                          !txCategoryId ||
                          categoriesForTx.length === 0
                        }
                        className="h-10 rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
                      >
                        {txBusy ? "Saving…" : "Add transaction"}
                      </button>
                    </div>
                  </form>
                )}

                <form
                  onSubmit={onApplyFilters}
                  className="mt-8 flex flex-wrap items-end gap-3 border-t border-border pt-6"
                >
                  <label className="flex min-w-[7rem] flex-col gap-1.5 text-sm">
                    <span className="font-medium text-ink">Filter type</span>
                    <select
                      value={filterType}
                      onChange={(e) =>
                        setFilterType(e.target.value as "" | TransactionType)
                      }
                      className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                    >
                      <option value="">All</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </label>
                  <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm">
                    <span className="font-medium text-ink">
                      Filter category
                    </span>
                    <select
                      value={filterCategoryId}
                      onChange={(e) => setFilterCategoryId(e.target.value)}
                      className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                    >
                      <option value="">All</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.kind})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium text-ink">From</span>
                    <input
                      type="date"
                      value={filterFrom}
                      onChange={(e) => setFilterFrom(e.target.value)}
                      className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium text-ink">To</span>
                    <input
                      type="date"
                      value={filterTo}
                      onChange={(e) => setFilterTo(e.target.value)}
                      className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
                    />
                  </label>
                  <button
                    type="submit"
                    className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-accent-soft"
                  >
                    Apply filters
                  </button>
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="h-10 rounded-[var(--radius-sm)] border border-border px-4 text-sm text-muted hover:bg-accent-soft"
                  >
                    Clear
                  </button>
                </form>

                {transactions.length === 0 ? (
                  <p className="mt-6 text-sm text-muted">
                    No transactions match. Add one or clear filters.
                  </p>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted">
                          <th className="py-2 pr-4 font-medium">Date</th>
                          <th className="py-2 pr-4 font-medium">Type</th>
                          <th className="py-2 pr-4 font-medium">Category</th>
                          <th className="py-2 pr-4 font-medium">Amount</th>
                          <th className="py-2 pr-4 font-medium">Note</th>
                          <th className="py-2 font-medium">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="border-b border-border/80"
                          >
                            <td className="py-2.5 pr-4 tabular-nums text-ink">
                              {formatTxDate(tx.date)}
                            </td>
                            <td className="py-2.5 pr-4 capitalize text-ink">
                              {tx.type}
                            </td>
                            <td className="py-2.5 pr-4 text-ink">
                              {tx.category.name}
                            </td>
                            <td
                              className={`py-2.5 pr-4 tabular-nums font-medium ${
                                tx.type === "income"
                                  ? "text-[var(--success)]"
                                  : "text-ink"
                              }`}
                            >
                              {tx.type === "income" ? "+" : "−"}
                              {formatMoney(tx.amount)}
                            </td>
                            <td className="py-2.5 pr-4 text-muted">
                              {tx.note ?? "—"}
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(tx.id)}
                                className="rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-xs text-[var(--danger)] hover:bg-accent-soft"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
