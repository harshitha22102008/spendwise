import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CountUp } from "./CountUp";
import type { MonthlySummary } from "../lib/types";

type Props = {
  summary: MonthlySummary | null;
  loading?: boolean;
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
};

const CHART_1 = "var(--chart-1)";
const CHART_2 = "var(--chart-3)";
const CHART_NAVY = "var(--chart-2)";
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
    <section className="sw-panel sw-panel-hover mt-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">
            Monthly summary
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {monthLabel(year, month)} — spend by category &amp; daily flow
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted">
            Month
          </span>
          <input
            type="month"
            value={toMonthInputValue(year, month)}
            onChange={(e) => {
              const parsed = parseMonthInput(e.target.value);
              if (parsed) onMonthChange(parsed.year, parsed.month);
            }}
            className="sw-input"
          />
        </label>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading chart data…</p>
      ) : !summary ? (
        <p className="mt-4 text-sm text-muted">Could not load summary.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-[var(--radius-sm)] border border-border bg-[#f8f9fc] px-3 py-2.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                Income
              </p>
              <p className="sw-stat mt-1 text-base text-income sm:text-lg">
                <CountUp value={summary.totals.income} />
              </p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-[#f8f9fc] px-3 py-2.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                Expense
              </p>
              <p className="sw-stat mt-1 text-base text-expense sm:text-lg">
                <CountUp value={summary.totals.expense} />
              </p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-[#f8f9fc] px-3 py-2.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                Net
              </p>
              <p
                className={`sw-stat mt-1 text-base sm:text-lg ${
                  summary.totals.net >= 0 ? "text-income" : "text-expense"
                }`}
              >
                <CountUp value={summary.totals.net} />
              </p>
            </div>
          </div>

          {summary.transactionCount === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No transactions this month. Add income or expenses to see charts.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="min-h-[15rem] rounded-[var(--radius-sm)] border border-border bg-[#f8f9fc] p-2 sm:p-3">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Expense by category
                </h3>
                {summary.byCategory.length === 0 ? (
                  <p className="mt-3 px-1 text-sm text-muted">
                    No expenses categorized this month.
                  </p>
                ) : (
                  <div className="mt-1 h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={summary.byCategory}
                        layout="vertical"
                        margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                        barCategoryGap="16%"
                      >
                        <CartesianGrid
                          stroke={BORDER}
                          strokeDasharray="2 4"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fill: MUTED, fontSize: 11 }}
                          axisLine={{ stroke: BORDER }}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={78}
                          tick={{ fill: MUTED, fontSize: 11 }}
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
                            fontSize: 12,
                            boxShadow: "var(--shadow-soft)",
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          fill={CHART_1}
                          radius={[0, 3, 3, 0]}
                          maxBarSize={22}
                          animationDuration={650}
                          animationBegin={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="min-h-[15rem] rounded-[var(--radius-sm)] border border-border bg-[#f8f9fc] p-2 sm:p-3">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Income &amp; expense by day
                </h3>
                <div className="mt-1 h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        byDayActive.length > 0 ? byDayActive : summary.byDay
                      }
                      margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                      barGap={2}
                      barCategoryGap="12%"
                    >
                      <CartesianGrid
                        stroke={BORDER}
                        strokeDasharray="2 4"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDay}
                        tick={{ fill: MUTED, fontSize: 11 }}
                        axisLine={{ stroke: BORDER }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: MUTED, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={36}
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
                          fontSize: 12,
                          boxShadow: "var(--shadow-soft)",
                        }}
                      />
                      <Bar
                        dataKey="income"
                        fill={CHART_2}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={18}
                        animationDuration={650}
                        animationBegin={80}
                      />
                      <Bar
                        dataKey="expense"
                        fill={CHART_NAVY}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={18}
                        animationDuration={650}
                        animationBegin={140}
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
