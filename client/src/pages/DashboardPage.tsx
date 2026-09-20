import { Link, useNavigate } from "react-router-dom";
import { clearAuth, getStoredUser } from "../lib/auth";

/** Placeholder until categories / transactions land. */
export function DashboardPage() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function onLogout() {
    clearAuth();
    navigate("/", { replace: true });
  }

  return (
    <main className="mx-auto min-h-screen max-w-[68rem] px-6 py-10 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm font-medium tracking-wide text-accent">
            SpendWise
          </p>
          <h1 className="font-display text-2xl sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-muted">
            Signed in as {user?.email ?? "you"}. Categories and transactions
            come next.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-border bg-surface px-4 text-sm font-medium text-ink transition hover:bg-accent-soft"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Sign out
          </button>
        </div>
      </header>
    </main>
  );
}
