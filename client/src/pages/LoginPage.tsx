import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api";
import { setAuth, type AuthUser } from "../lib/auth";

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiPost<AuthResponse>("/api/auth/login", {
        email,
        password,
      });
      setAuth(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="animate-fade-in">
        <Link to="/" className="sw-nav-link text-lg text-ink">
          SpendWise
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-[-0.03em]">
          Sign in
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Welcome back — open your private ledger.
        </p>

        <form onSubmit={onSubmit} className="sw-panel sw-panel-hover mt-7 p-5">
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sw-input w-full"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="sw-input w-full"
              />
            </label>

            {error ? (
              <p className="text-sm text-expense" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="sw-btn sw-btn-primary mt-1 h-10 w-full disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <p className="mt-5 text-sm text-muted">
          No account yet?{" "}
          <Link
            to="/register"
            className="font-semibold text-ink underline decoration-accent underline-offset-2 hover:text-accent-hover"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
