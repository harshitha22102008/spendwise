import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlySummary } from "../lib/types";

type Props = {
  summary: MonthlySummary | null;
  loading?: boolean;
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
};

const CHART_1 = "var(--chart-1)";
const CHART_2 = "var(--chart-2)";
const MUTED = "var(--color-muted)";
const BORDER = "var(--color-border)";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

export function toMonthInputValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthInput(
  value: string,
): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function shortDay(date: string): string {
  return String(Number(date.slice(8, 10)));
}

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function MonthlyCharts({
  summary,
  loading,
  year,
  month,
  onMonthChange,
}: Props) {
  const byDayActive =
    summary?.byDay.filter((d) => d.income > 0 || d.expense > 0) ?? [];

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Monthly summary</h2>
          <p className="mt-1 text-sm text-muted">
            Spend by category and daily totals for {monthLabel(year, month)}.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Month</span>
          <input
            type="month"
            value={toMonthInputValue(year, month)}
            onChange={(e) => {
              const parsed = parseMonthInput(e.target.value);
              if (parsed) onMonthChange(parsed.year, parsed.month);
            }}
            className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-ink"
          />
        </label>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading chart data…</p>
      ) : !summary ? (
        <p className="mt-6 text-sm text-muted">Could not load summary.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <p>
              <span className="text-muted">Income</span>{" "}
              <span className="font-medium text-[var(--success)]">
                {formatMoney(summary.totals.income)}
              </span>
            </p>
            <p>
              <span className="text-muted">Expense</span>{" "}
              <span className="font-medium text-ink">
                {formatMoney(summary.totals.expense)}
              </span>
            </p>
            <p>
              <span className="text-muted">Net</span>{" "}
              <span
                className={`font-medium ${
                  summary.totals.net >= 0
                    ? "text-[var(--success)]"
                    : "text-[var(--danger)]"
                }`}
              >
                {formatMoney(summary.totals.net)}
              </span>
            </p>
          </div>

          {summary.transactionCount === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No transactions this month. Add income or expenses to see charts.
            </p>
          ) : (
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-ink">
                  Expense by category
                </h3>
                {summary.byCategory.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">
                    No expenses categorized this month.
                  </p>
                ) : (
                  <div className="mt-3 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={summary.byCategory}
                        layout="vertical"
                        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke={BORDER}
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fill: MUTED, fontSize: 12 }}
                          axisLine={{ stroke: BORDER }}
                          tickLine={false}
                          label={{
                            value: "Amount",
                            position: "insideBottom",
                            offset: -2,
                            fill: MUTED,
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={88}
                          tick={{ fill: MUTED, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [
                            formatMoney(Number(value)),
                            "Spent",
                          ]}
                          contentStyle={{
                            borderRadius: 6,
                            borderColor: BORDER,
                            fontSize: 13,
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          fill={CHART_1}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-ink">
                  Income &amp; expense by day
                </h3>
                <div className="mt-3 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        byDayActive.length > 0 ? byDayActive : summary.byDay
                      }
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke={BORDER}
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDay}
                        tick={{ fill: MUTED, fontSize: 12 }}
                        axisLine={{ stroke: BORDER }}
                        tickLine={false}
                        interval="preserveStartEnd"
                        label={{
                          value: "Day",
                          position: "insideBottom",
                          offset: -2,
                          fill: MUTED,
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        tick={{ fill: MUTED, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        label={{
                          value: "Amount",
                          angle: -90,
                          position: "insideLeft",
                          fill: MUTED,
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatMoney(Number(value)),
                          name === "income" ? "Income" : "Expense",
                        ]}
                        labelFormatter={(label) => String(label)}
                        contentStyle={{
                          borderRadius: 6,
                          borderColor: BORDER,
                          fontSize: 13,
                        }}
                      />
                      <Bar
                        dataKey="income"
                        fill={CHART_2}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        fill={CHART_1}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
