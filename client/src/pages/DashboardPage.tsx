import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { clearAuth, getStoredUser, type AuthUser } from "../lib/auth";
import type { Category, CategoryKind } from "../lib/types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);

  const [categoryName, setCategoryName] = useState("");
  const [categoryKind, setCategoryKind] = useState<CategoryKind>("expense");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<CategoryKind>("expense");

  async function loadCategories() {
    const data = await apiGet<{ categories: Category[] }>(
      "/api/categories",
      true,
    );
    setCategories(data.categories);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ user: AuthUser }>("/api/auth/me", true);
        if (cancelled) return;
        setUser(data.user);
        await loadCategories();
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
  }, [navigate]);

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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    } finally {
      setCategoryBusy(false);
    }
  }

  const incomeCount = categories.filter((c) => c.kind === "income").length;
  const expenseCount = categories.filter((c) => c.kind === "expense").length;

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
            . Manage categories for income and expenses.
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
                  <span className="text-muted">Income</span>{" "}
                  <span className="font-medium text-ink">{incomeCount}</span>
                </p>
                <p>
                  <span className="text-muted">Expense</span>{" "}
                  <span className="font-medium text-ink">{expenseCount}</span>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
