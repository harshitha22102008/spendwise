import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CountUp } from "../components/CountUp";
import { CsvTools } from "../components/CsvTools";
import { MonthlyCharts } from "../components/MonthlyCharts";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { clearAuth, getStoredUser, type AuthUser } from "../lib/auth";
import type {
  Category,
  CategoryKind,
  MonthlySummary,
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

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
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

  const initialYm = currentYearMonth();
  const [summaryYear, setSummaryYear] = useState(initialYm.year);
  const [summaryMonth, setSummaryMonth] = useState(initialYm.month);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [kpiFlash, setKpiFlash] = useState<"income" | "expense" | null>(null);
  const skipFlashRef = useRef(true);

  const categoriesForTx = useMemo(
    () => categories.filter((c) => c.kind === txType),
    [categories, txType],
  );

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const netListed = totalIncome - totalExpense;
  const incomeCount = categories.filter((c) => c.kind === "income").length;
  const expenseCount = categories.filter((c) => c.kind === "expense").length;

  useEffect(() => {
    if (skipFlashRef.current) {
      skipFlashRef.current = false;
      return;
    }
    const kind = totalIncome >= totalExpense ? "income" : "expense";
    setKpiFlash(kind);
    const t = window.setTimeout(() => setKpiFlash(null), 700);
    return () => window.clearTimeout(t);
  }, [totalIncome, totalExpense]);

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

  async function loadSummary(year = summaryYear, month = summaryMonth) {
    setSummaryLoading(true);
    try {
      const data = await apiGet<MonthlySummary>(
        `/api/summary/month?year=${year}&month=${month}`,
        true,
      );
      setSummary(data);
    } finally {
      setSummaryLoading(false);
    }
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
        await loadSummary();
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
      await loadSummary();
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
      await loadSummary();
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

  const netFlashClass =
    kpiFlash === "income"
      ? "sw-kpi-flash-income"
      : kpiFlash === "expense"
        ? "sw-kpi-flash-expense"
        : "";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink bg-ink text-white">
        <div className="mx-auto flex h-[var(--nav-h)] max-w-[var(--max-w)] items-center justify-between px-4 sm:px-5">
          <Link
            to="/dashboard"
            className="sw-nav-link text-base text-white"
            data-active="true"
          >
            SpendWise
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/55 sm:inline">
              {user?.name || user?.email}
            </span>
            <button
              type="button"
              onClick={logout}
              className="sw-btn h-8 border border-white/20 bg-transparent px-3 text-xs text-white hover:border-accent hover:bg-white/5"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[var(--max-w)] px-4 py-4 sm:px-5 sm:py-5">
        <div className="animate-fade-in">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
                Ledger
              </h1>
              <p className="mt-0.5 text-xs text-muted">
                KPIs, charts, categories, and transactions — dense by design.
              </p>
            </div>
          </div>

          {error ? (
            <p
              className="mt-3 rounded-[var(--radius-sm)] border border-expense/30 bg-accent-soft/40 px-3 py-2 text-sm text-expense"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-8 text-sm text-muted">Loading…</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                <div
                  className={`sw-panel sw-panel-hover px-3 py-2.5 ${kpiFlash === "income" ? "sw-kpi-flash-income" : ""}`}
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Listed income
                  </p>
                  <p className="sw-stat mt-1.5 text-lg text-income">
                    <CountUp value={totalIncome} />
                  </p>
                </div>
                <div
                  className={`sw-panel sw-panel-hover px-3 py-2.5 ${kpiFlash === "expense" ? "sw-kpi-flash-expense" : ""}`}
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Listed expense
                  </p>
                  <p className="sw-stat mt-1.5 text-lg text-expense">
                    <CountUp value={totalExpense} />
                  </p>
                </div>
                <div
                  className={`sw-panel sw-panel-hover px-3 py-2.5 ${netFlashClass}`}
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Net (listed)
                  </p>
                  <p
                    className={`sw-stat mt-1.5 text-lg ${
                      netListed >= 0 ? "text-income" : "text-expense"
                    }`}
                  >
                    <CountUp value={netListed} />
                  </p>
                </div>
                <div className="sw-panel sw-panel-hover px-3 py-2.5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Categories
                  </p>
                  <p className="sw-stat mt-1.5 text-lg text-ink">
                    <CountUp value={categories.length} decimals={0} />
                  </p>
                  <p className="mt-1 text-[0.65rem] text-muted">
                    {incomeCount} in · {expenseCount} out
                  </p>
                </div>
                <div className="sw-panel sw-panel-hover col-span-2 px-3 py-2.5 sm:col-span-1">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    Transactions
                  </p>
                  <p className="sw-stat mt-1.5 text-lg text-ink">
                    <CountUp value={transactions.length} decimals={0} />
                  </p>
                </div>
              </div>

              <MonthlyCharts
                summary={summary}
                loading={summaryLoading}
                year={summaryYear}
                month={summaryMonth}
                onMonthChange={async (year, month) => {
                  setSummaryYear(year);
                  setSummaryMonth(month);
                  setError(null);
                  try {
                    await loadSummary(year, month);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to load summary",
                    );
                  }
                }}
              />

              <div className="mt-3 grid gap-3 lg:grid-cols-5">
                <section className="sw-panel sw-panel-hover p-4 lg:col-span-2">
                  <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">
                    Categories
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Buckets for income and spending.
                  </p>

                  <form
                    onSubmit={onCreateCategory}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. Groceries"
                      className="sw-input min-w-0 flex-1"
                    />
                    <select
                      value={categoryKind}
                      onChange={(e) =>
                        setCategoryKind(e.target.value as CategoryKind)
                      }
                      className="sw-input w-[7.5rem]"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <button
                      type="submit"
                      disabled={categoryBusy}
                      className="sw-btn sw-btn-primary disabled:opacity-60"
                    >
                      {categoryBusy ? "…" : "Add"}
                    </button>
                  </form>

                  {categories.length === 0 ? (
                    <p className="mt-4 text-xs text-muted">
                      No categories yet. Add one to start tracking.
                    </p>
                  ) : (
                    <ul className="mt-3 max-h-[22rem] divide-y divide-border overflow-y-auto border-t border-border">
                      {categories.map((category) => (
                        <li
                          key={category.id}
                          className="sw-row flex flex-wrap items-center gap-2 px-2 py-2"
                        >
                          {editingId === category.id ? (
                            <>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="sw-input h-8 min-w-0 flex-1 text-xs"
                              />
                              <select
                                value={editKind}
                                onChange={(e) =>
                                  setEditKind(e.target.value as CategoryKind)
                                }
                                className="sw-input h-8 w-[6.5rem] text-xs"
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                              </select>
                              <button
                                type="button"
                                disabled={categoryBusy}
                                onClick={() => onSaveCategory(category.id)}
                                className="sw-btn sw-btn-primary h-8 px-2 text-xs disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="sw-btn sw-btn-ghost h-8 px-2 text-xs"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                                {category.name}
                              </span>
                              <span
                                className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                                  category.kind === "income"
                                    ? "bg-accent-soft text-income"
                                    : "bg-[#eef1f6] text-muted"
                                }`}
                              >
                                {category.kind}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(category.id);
                                  setEditName(category.name);
                                  setEditKind(category.kind);
                                }}
                                className="sw-btn sw-btn-ghost h-7 px-2 text-[0.7rem]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteCategory(category.id)}
                                className="sw-btn h-7 border border-border px-2 text-[0.7rem] text-expense hover:bg-accent-soft"
                              >
                                Del
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="sw-panel sw-panel-hover p-4 lg:col-span-3">
                  <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">
                    Transactions
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Dense ledger rows — filter inline.
                  </p>

                  {categories.length === 0 ? (
                    <p className="mt-4 text-xs text-muted">
                      Add a category before logging a transaction.
                    </p>
                  ) : (
                    <form
                      onSubmit={onCreateTransaction}
                      className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      <select
                        value={txType}
                        onChange={(e) =>
                          setTxType(e.target.value as TransactionType)
                        }
                        className="sw-input"
                        aria-label="Type"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                      <select
                        required
                        value={txCategoryId}
                        onChange={(e) => setTxCategoryId(e.target.value)}
                        className="sw-input"
                        aria-label="Category"
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
                      <input
                        type="number"
                        required
                        min={0.01}
                        step="0.01"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        placeholder="Amount"
                        className="sw-input font-mono"
                        aria-label="Amount"
                      />
                      <input
                        type="date"
                        required
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        className="sw-input"
                        aria-label="Date"
                      />
                      <input
                        type="text"
                        maxLength={200}
                        value={txNote}
                        onChange={(e) => setTxNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="sw-input"
                        aria-label="Note"
                      />
                      <button
                        type="submit"
                        disabled={
                          txBusy ||
                          !txCategoryId ||
                          categoriesForTx.length === 0
                        }
                        className="sw-btn sw-btn-primary disabled:opacity-60"
                      >
                        {txBusy ? "Saving…" : "Add transaction"}
                      </button>
                    </form>
                  )}

                  <form
                    onSubmit={onApplyFilters}
                    className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3"
                  >
                    <select
                      value={filterType}
                      onChange={(e) =>
                        setFilterType(e.target.value as "" | TransactionType)
                      }
                      className="sw-input w-[6.5rem]"
                      aria-label="Filter type"
                    >
                      <option value="">All types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    <select
                      value={filterCategoryId}
                      onChange={(e) => setFilterCategoryId(e.target.value)}
                      className="sw-input min-w-[8rem] flex-1"
                      aria-label="Filter category"
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.kind})
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={filterFrom}
                      onChange={(e) => setFilterFrom(e.target.value)}
                      className="sw-input"
                      aria-label="From"
                    />
                    <input
                      type="date"
                      value={filterTo}
                      onChange={(e) => setFilterTo(e.target.value)}
                      className="sw-input"
                      aria-label="To"
                    />
                    <button type="submit" className="sw-btn sw-btn-ghost">
                      Filter
                    </button>
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="sw-btn h-9 border-0 bg-transparent px-2 text-xs text-muted hover:text-ink"
                    >
                      Clear
                    </button>
                  </form>

                  {transactions.length === 0 ? (
                    <p className="mt-4 text-xs text-muted">
                      No transactions match. Add one or clear filters.
                    </p>
                  ) : (
                    <div className="mt-3 overflow-x-auto rounded-[var(--radius-sm)] border border-border">
                      <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-ink text-[0.65rem] uppercase tracking-wide text-white/70">
                            <th className="px-2.5 py-2 font-semibold">Date</th>
                            <th className="px-2.5 py-2 font-semibold">Type</th>
                            <th className="px-2.5 py-2 font-semibold">
                              Category
                            </th>
                            <th className="px-2.5 py-2 text-right font-semibold">
                              Amount
                            </th>
                            <th className="px-2.5 py-2 font-semibold">Note</th>
                            <th className="px-2.5 py-2 font-semibold">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx) => (
                            <tr
                              key={tx.id}
                              className="sw-row border-t border-border"
                            >
                              <td className="px-2.5 py-1.5 font-mono text-ink">
                                {formatTxDate(tx.date)}
                              </td>
                              <td className="px-2.5 py-1.5 capitalize text-muted">
                                {tx.type}
                              </td>
                              <td className="px-2.5 py-1.5">
                                <span className="inline-flex rounded-[var(--radius-sm)] border border-border bg-[#f8f9fc] px-1.5 py-0.5 text-[0.7rem] font-medium text-ink">
                                  {tx.category.name}
                                </span>
                              </td>
                              <td
                                className={`px-2.5 py-1.5 text-right font-mono font-semibold ${
                                  tx.type === "income"
                                    ? "text-income"
                                    : "text-expense"
                                }`}
                              >
                                {tx.type === "income" ? "+" : "−"}
                                {formatMoney(tx.amount)}
                              </td>
                              <td className="max-w-[10rem] truncate px-2.5 py-1.5 text-muted">
                                {tx.note ?? "—"}
                              </td>
                              <td className="px-2.5 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => onDeleteTransaction(tx.id)}
                                  className="sw-btn h-7 border border-border px-2 text-[0.65rem] text-expense hover:bg-accent-soft"
                                >
                                  Del
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>

              <CsvTools
                onError={(msg) => setError(msg || null)}
                onImported={async () => {
                  await loadCategories();
                  await loadTransactions();
                  await loadSummary();
                }}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
