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
