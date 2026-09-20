import { Link } from "react-router-dom";
import { isLoggedIn } from "../lib/auth";

export function HomePage() {
  const loggedIn = isLoggedIn();

  return (
    <main className="mx-auto flex min-h-screen max-w-[68rem] flex-col justify-center px-6 py-12 animate-fade-in">
      <p className="mb-3 text-sm font-medium tracking-wide text-accent">
        SpendWise
      </p>
      <h1 className="font-display text-3xl sm:text-[2.25rem]">
        See where your money goes
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Track income and expenses by category, view monthly charts, and move
        data in or out with CSV.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {loggedIn ? (
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-accent px-4 font-medium text-white transition hover:bg-accent-hover"
          >
            Open dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/register"
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-accent px-4 font-medium text-white transition hover:bg-accent-hover"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-border bg-surface px-4 font-medium text-ink transition hover:bg-accent-soft"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
