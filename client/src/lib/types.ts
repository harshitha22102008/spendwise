export type CategoryKind = "income" | "expense";
export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  date: string;
  note: string | null;
  categoryId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    kind: CategoryKind;
    color: string | null;
  };
};

export type MonthlySummary = {
  year: number;
  month: number;
  from: string;
  to: string;
  totals: {
    income: number;
    expense: number;
    net: number;
  };
  byCategory: Array<{
    categoryId: string;
    name: string;
    type: string;
    amount: number;
    color: string | null;
  }>;
  byDay: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
  transactionCount: number;
};
