export function HomePage() {
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
        data in or out with CSV. Auth and transactions come next.
      </p>
      <p className="mt-8 text-sm text-muted">
        API health:{" "}
        <code className="rounded bg-accent-soft px-1.5 py-0.5 text-ink">
          GET /api/health
        </code>
      </p>
    </main>
  );
}
