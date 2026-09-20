import { Link } from "react-router-dom";
import { isLoggedIn } from "../lib/auth";

export function HomePage() {
  const loggedIn = isLoggedIn();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 75% 55% at 40% 25%, black 15%, transparent 70%)",
        }}
        aria-hidden
      />

      <header className="relative z-10 border-b border-border/80 bg-surface/75 backdrop-blur-md">
        <div className="mx-auto flex h-[var(--nav-h)] max-w-[var(--max-w)] items-center justify-between px-5">
          <Link to="/" className="sw-nav-link text-lg text-ink" data-active="true">
            SpendWise
          </Link>
          <nav className="flex items-center gap-2">
            {loggedIn ? (
              <Link to="/dashboard" className="sw-btn sw-btn-primary">
                Open ledger
              </Link>
            ) : (
              <>
                <Link to="/login" className="sw-btn sw-btn-ghost">
                  Sign in
                </Link>
                <Link to="/register" className="sw-btn sw-btn-navy">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-var(--nav-h))] max-w-[var(--max-w)] flex-col justify-center px-5 py-14">
        <div className="animate-fade-in max-w-2xl">
          <p className="font-display text-[clamp(2.75rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink">
            Spend
            <span className="text-accent">Wise</span>
          </p>
          <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
            Private ledger. Precise money.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted sm:text-base">
            Track income and expenses in a dense ledger — categories, monthly
            charts, and CSV in and out. Clarity over decoration.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 animate-fade-in-delay">
            {loggedIn ? (
              <Link to="/dashboard" className="sw-btn sw-btn-primary h-11 px-5">
                Open ledger
              </Link>
            ) : (
              <>
                <Link to="/register" className="sw-btn sw-btn-primary h-11 px-5">
                  Create account
                </Link>
                <Link to="/login" className="sw-btn sw-btn-ghost h-11 px-5">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        <aside className="mt-12 grid max-w-3xl gap-3 sm:grid-cols-3 animate-fade-in-delay">
          {[
            { label: "Categories", detail: "Income & expense buckets" },
            { label: "Charts", detail: "Month by category & day" },
            { label: "CSV", detail: "Same columns in & out" },
          ].map((item) => (
            <div key={item.label} className="sw-panel sw-panel-hover px-4 py-3">
              <p className="font-display text-sm font-semibold text-ink">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-muted">{item.detail}</p>
            </div>
          ))}
        </aside>
      </main>
    </div>
  );
}
