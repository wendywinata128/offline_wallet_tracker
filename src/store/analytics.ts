import type { AppData, Transaction } from "@/types";
import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  startOfMonth,
  subMonths,
} from "date-fns";
import { toDate } from "@/lib/format";
import { walletBalanceMap } from "./selectors";

export interface MonthlyPoint {
  key: string; // yyyy-MM
  label: string; // Jan
  income: number;
  expense: number;
  net: number;
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  value: number;
  percent: number;
}

export interface WalletSlice {
  walletId: string;
  name: string;
  color: string;
  icon: string;
  value: number;
  percent: number;
}

export interface DailyPoint {
  date: string;
  label: string;
  expense: number;
  income: number;
}

function inRange(t: Transaction, start: Date, end: Date): boolean {
  return isWithinInterval(toDate(t.date), { start, end });
}

/** Income vs expense per month over the trailing `months` window. */
export function monthlySeries(data: AppData, months = 6): MonthlyPoint[] {
  const now = new Date();
  const start = startOfMonth(subMonths(now, months - 1));
  const buckets = eachMonthOfInterval({ start, end: now }).map((d) => ({
    key: format(d, "yyyy-MM"),
    label: format(d, "MMM"),
    income: 0,
    expense: 0,
    net: 0,
  }));
  const index = new Map(buckets.map((b, i) => [b.key, i]));

  for (const t of data.transactions) {
    if (t.type === "transfer") continue;
    const key = format(toDate(t.date), "yyyy-MM");
    const i = index.get(key);
    if (i == null) continue;
    if (t.type === "income") buckets[i].income += t.amount;
    else buckets[i].expense += t.amount;
  }
  for (const b of buckets) b.net = b.income - b.expense;
  return buckets;
}

/** Aggregate a flow by category within a month offset (0 = current month). */
export function categoryBreakdown(
  data: AppData,
  flow: "expense" | "income",
  monthOffset = 0,
): CategorySlice[] {
  const ref = subMonths(new Date(), monthOffset);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  const catMap = new Map(data.categories.map((c) => [c.id, c]));
  const totals = new Map<string | null, number>();

  for (const t of data.transactions) {
    if (t.type !== flow) continue;
    if (!inRange(t, start, end)) continue;
    const key = t.categoryId ?? null;
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }

  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  const slices: CategorySlice[] = [];
  for (const [categoryId, value] of totals) {
    const cat = categoryId ? catMap.get(categoryId) : undefined;
    slices.push({
      categoryId,
      name: cat?.name ?? "Uncategorized",
      color: cat?.color ?? "slate",
      icon: cat?.icon ?? "more",
      value,
      percent: grand > 0 ? (value / grand) * 100 : 0,
    });
  }
  return slices.sort((a, b) => b.value - a.value);
}

/** Current balance distribution across wallets (positive balances only). */
export function walletDistribution(data: AppData): WalletSlice[] {
  const balances = walletBalanceMap(data);
  const slices: WalletSlice[] = [];
  let grand = 0;
  for (const w of data.wallets) {
    if (w.archived || w.excludeFromTotal) continue;
    const bal = balances.get(w.id) ?? 0;
    if (bal <= 0) continue;
    grand += bal;
    slices.push({
      walletId: w.id,
      name: w.name,
      color: w.color,
      icon: w.icon,
      value: bal,
      percent: 0,
    });
  }
  for (const s of slices) s.percent = grand > 0 ? (s.value / grand) * 100 : 0;
  return slices.sort((a, b) => b.value - a.value);
}

/** Daily expense/income for a given month offset. */
export function dailySeries(data: AppData, monthOffset = 0): DailyPoint[] {
  const ref = subMonths(new Date(), monthOffset);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  const days = end.getDate();
  const points: DailyPoint[] = Array.from({ length: days }, (_, i) => ({
    date: format(new Date(ref.getFullYear(), ref.getMonth(), i + 1), "yyyy-MM-dd"),
    label: String(i + 1),
    expense: 0,
    income: 0,
  }));

  for (const t of data.transactions) {
    if (t.type === "transfer") continue;
    if (!inRange(t, start, end)) continue;
    const day = toDate(t.date).getDate() - 1;
    if (day < 0 || day >= points.length) continue;
    if (t.type === "expense") points[day].expense += t.amount;
    else points[day].income += t.amount;
  }
  return points;
}

/** Cumulative net-worth trajectory over the trailing window. */
export function cashFlowSeries(data: AppData, months = 6): MonthlyPoint[] {
  const series = monthlySeries(data, months);
  let cumulative = 0;
  return series.map((m) => {
    cumulative += m.net;
    return { ...m, net: cumulative };
  });
}
