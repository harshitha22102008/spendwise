export type CategoryKind = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};
