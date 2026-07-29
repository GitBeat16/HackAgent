import type { TrendValue } from "@/types/common";

export interface CapTableRow {
  holder: string;
  role: string;
  ownership: number;
}

export interface RevenueExpensePoint {
  month: string;
  revenue: number;
  expense: number;
}

export interface FinancialsData {
  metrics: Array<{ label: string; value: string; trend: TrendValue }>;
  revenueExpense: RevenueExpensePoint[];
  capTable: CapTableRow[];
}
