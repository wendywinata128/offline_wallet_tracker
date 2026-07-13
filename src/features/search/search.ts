import type { AppData, Transaction } from "@/types";
import { formatDate } from "@/lib/format";

export interface SearchIndexEntry {
  txn: Transaction;
  haystack: string;
}

/** Build a lowercase searchable string per transaction across every field. */
export function buildSearchIndex(data: AppData): SearchIndexEntry[] {
  const walletName = new Map(data.wallets.map((w) => [w.id, w.name]));
  const catName = new Map(data.categories.map((c) => [c.id, c.name]));

  return data.transactions.map((txn) => {
    const parts = [
      txn.description,
      txn.notes ?? "",
      txn.tags.join(" "),
      String(txn.amount),
      txn.categoryId ? catName.get(txn.categoryId) ?? "" : "",
      walletName.get(txn.walletId) ?? "",
      txn.toWalletId ? walletName.get(txn.toWalletId) ?? "" : "",
      formatDate(txn.date, "MMMM d yyyy"),
      formatDate(txn.date, "yyyy-MM-dd"),
      txn.type,
    ];
    return { txn, haystack: parts.join("  ").toLowerCase() };
  });
}

/** Multi-term AND search; returns matching transactions newest-first. */
export function searchTransactions(
  index: SearchIndexEntry[],
  query: string,
  limit = 40,
): Transaction[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const results: Transaction[] = [];
  for (const entry of index) {
    if (terms.every((t) => entry.haystack.includes(t))) {
      results.push(entry.txn);
      if (results.length >= limit) break;
    }
  }
  return results.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* --- recent searches (session-scoped, in-memory) --- */
const recents: string[] = [];

export function recordSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  const i = recents.indexOf(q);
  if (i > -1) recents.splice(i, 1);
  recents.unshift(q);
  if (recents.length > 6) recents.pop();
}

export function recentSearches(): string[] {
  return [...recents];
}
