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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 animate-fade-in">
      <p className="mb-2 text-sm font-medium tracking-wide text-accent">
        SpendWise
      </p>
      <h1 className="font-display text-3xl">Sign in</h1>
      <p className="mt-2 text-muted">
        Welcome back. Track income and expenses after login.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)]"
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink focus-visible:outline-none focus-visible:shadow-[var(--ring)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink focus-visible:outline-none focus-visible:shadow-[var(--ring)]"
            />
          </label>

          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-10 rounded-[var(--radius-sm)] bg-accent px-4 font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted">
        No account yet?{" "}
        <Link
          to="/register"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Create one
        </Link>
      </p>
    </main>
  );
}
