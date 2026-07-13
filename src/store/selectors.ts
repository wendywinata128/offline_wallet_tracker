import type {
  AppData,
  Budget,
  DashboardTotals,
  Transaction,
  Wallet,
  WalletComputed,
} from "@/types";
import { isSameDay, isSameMonth } from "date-fns";
import { toDate } from "@/lib/format";
import { byKey } from "@/lib/utils";

/**
 * The signed effect a transaction has on a given wallet's balance.
 *  income  -> +amount on walletId
 *  expense -> -amount on walletId
 *  transfer-> -amount on source (walletId), +amount on dest (toWalletId)
 */
export function walletDelta(txn: Transaction, walletId: string): number {
  if (txn.type === "income" && txn.walletId === walletId) return txn.amount;
  if (txn.type === "expense" && txn.walletId === walletId) return -txn.amount;
  if (txn.type === "transfer") {
    if (txn.walletId === walletId) return -txn.amount;
    if (txn.toWalletId === walletId) return txn.amount;
  }
  return 0;
}

/** All transactions touching a wallet, newest first. */
export function transactionsForWallet(
  transactions: Transaction[],
  walletId: string,
): Transaction[] {
  return transactions
    .filter((t) => t.walletId === walletId || t.toWalletId === walletId)
    .sort(byKey((t) => t.date, "desc"));
}

export function computeWallet(
  wallet: Wallet,
  transactions: Transaction[],
): WalletComputed {
  let balance = wallet.initialBalance;
  let totalIncome = 0;
  let totalExpense = 0;
  let count = 0;
  let last: Transaction | null = null;

  for (const t of transactions) {
    const delta = walletDelta(t, wallet.id);
    if (delta === 0) continue;
    balance += delta;
    count += 1;
    if (t.type === "income" && t.walletId === wallet.id) totalIncome += t.amount;
    if (t.type === "expense" && t.walletId === wallet.id) totalExpense += t.amount;
    if (t.type === "transfer") {
      if (t.toWalletId === wallet.id) totalIncome += t.amount;
      if (t.walletId === wallet.id) totalExpense += t.amount;
    }
    if (!last || toDate(t.date) > toDate(last.date)) last = t;
  }

  return {
    wallet,
    balance,
    totalIncome,
    totalExpense,
    transactionCount: count,
    lastTransaction: last,
  };
}

/** Compute every wallet at once (single pass per wallet). */
export function computeAllWallets(data: AppData): WalletComputed[] {
  return data.wallets.map((w) => computeWallet(w, data.transactions));
}

export function walletBalanceMap(data: AppData): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of data.wallets) map.set(w.id, w.initialBalance);
  for (const t of data.transactions) {
    if (t.type === "income") {
      map.set(t.walletId, (map.get(t.walletId) ?? 0) + t.amount);
    } else if (t.type === "expense") {
      map.set(t.walletId, (map.get(t.walletId) ?? 0) - t.amount);
    } else if (t.type === "transfer") {
      map.set(t.walletId, (map.get(t.walletId) ?? 0) - t.amount);
      if (t.toWalletId) map.set(t.toWalletId, (map.get(t.toWalletId) ?? 0) + t.amount);
    }
  }
  return map;
}

export function computeTotals(data: AppData): DashboardTotals {
  const balances = walletBalanceMap(data);
  const now = new Date();

  let totalAssets = 0;
  let netWorth = 0;
  let walletCount = 0;

  for (const w of data.wallets) {
    if (w.archived) continue;
    walletCount += 1;
    if (w.excludeFromTotal) continue;
    const bal = balances.get(w.id) ?? 0;
    netWorth += bal;
    if (bal > 0) totalAssets += bal;
  }

  let todaySpending = 0;
  let monthSpending = 0;
  let monthIncome = 0;
  for (const t of data.transactions) {
    const d = toDate(t.date);
    if (t.type === "expense") {
      if (isSameDay(d, now)) todaySpending += t.amount;
      if (isSameMonth(d, now)) monthSpending += t.amount;
    } else if (t.type === "income") {
      if (isSameMonth(d, now)) monthIncome += t.amount;
    }
  }

  return {
    totalAssets,
    netWorth,
    todaySpending,
    monthSpending,
    monthIncome,
    walletCount,
  };
}

/** Running balance for a wallet's transaction list, oldest → newest applied. */
export function withRunningBalance(
  wallet: Wallet,
  txnsNewestFirst: Transaction[],
): Array<{ txn: Transaction; running: number; delta: number }> {
  const oldestFirst = [...txnsNewestFirst].reverse();
  let running = wallet.initialBalance;
  const map = new Map<string, { running: number; delta: number }>();
  for (const t of oldestFirst) {
    const delta = walletDelta(t, wallet.id);
    running += delta;
    map.set(t.id, { running, delta });
  }
  return txnsNewestFirst.map((txn) => ({
    txn,
    running: map.get(txn.id)?.running ?? 0,
    delta: map.get(txn.id)?.delta ?? 0,
  }));
}

/** Spend for the current month against a budget (category or global). */
export function budgetSpend(data: AppData, budget: Budget): number {
  const now = new Date();
  let spent = 0;
  for (const t of data.transactions) {
    if (t.type !== "expense") continue;
    if (!isSameMonth(toDate(t.date), now)) continue;
    if (budget.categoryId == null || t.categoryId === budget.categoryId) {
      spent += t.amount;
    }
  }
  return spent;
}
