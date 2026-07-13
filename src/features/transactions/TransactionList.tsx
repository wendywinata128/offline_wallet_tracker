import { useMemo, useState } from "react";
import { Filter, Inbox, Search } from "lucide-react";
import type { Transaction, TransactionType } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { TransactionItem } from "./TransactionItem";
import { useCategories, useData } from "@/store/hooks";
import { useDebounce } from "@/hooks/use-debounce";
import { friendlyDay, toDate } from "@/lib/format";
import { buildSearchIndex, searchTransactions } from "@/features/search/search";
import { groupBy } from "@/lib/utils";
import { format } from "date-fns";

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
const PAGE_SIZE = 25;

interface Props {
  transactions: Transaction[];
  showWallet?: boolean;
  /** transaction id → running balance (wallet detail only) */
  runningBalances?: Map<string, number>;
  emptyAction?: React.ReactNode;
}

export function TransactionList({
  transactions,
  showWallet,
  runningBalances,
  emptyAction,
}: Props) {
  const categories = useCategories();
  const data = useData();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [page, setPage] = useState(1);

  const debounced = useDebounce(query, 180);

  // Search across the provided subset (rebuild index on that subset).
  const searchIndex = useMemo(
    () => buildSearchIndex({ ...data, transactions }),
    [data, transactions],
  );

  const filtered = useMemo(() => {
    let list = debounced.trim()
      ? searchTransactions(searchIndex, debounced, 9999)
      : transactions;

    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);
    if (categoryFilter !== "all") {
      list = list.filter((t) =>
        categoryFilter === "none" ? !t.categoryId : t.categoryId === categoryFilter,
      );
    }

    const sorters: Record<SortKey, (a: Transaction, b: Transaction) => number> = {
      "date-desc": (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime(),
      "date-asc": (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime(),
      "amount-desc": (a, b) => b.amount - a.amount,
      "amount-asc": (a, b) => a.amount - b.amount,
    };
    return [...list].sort(sorters[sort]);
  }, [transactions, searchIndex, debounced, typeFilter, categoryFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Group the current page by calendar day for readable sections.
  const groups = useMemo(() => {
    const byDay = groupBy(paged, (t) => format(toDate(t.date), "yyyy-MM-dd"));
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [paged]);

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            placeholder="Search transactions…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as typeof typeFilter);
              resetPage();
            }}
          >
            <SelectTrigger className="w-[120px]">
              <Filter className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              resetPage();
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest</SelectItem>
              <SelectItem value="date-asc">Oldest</SelectItem>
              <SelectItem value="amount-desc">Highest</SelectItem>
              <SelectItem value="amount-asc">Lowest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No transactions"
          description={
            query || typeFilter !== "all" || categoryFilter !== "all"
              ? "No transactions match your filters."
              : "Nothing here yet."
          }
          action={emptyAction}
        />
      ) : (
        <div className="space-y-4">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="sticky top-16 z-10 mb-1 bg-background/80 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground glass">
                {friendlyDay(items[0].date)}
              </p>
              <div>
                {items.map((txn) => (
                  <TransactionItem
                    key={txn.id}
                    txn={txn}
                    showWallet={showWallet}
                    running={runningBalances?.get(txn.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {pageCount > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {safePage} of {pageCount} · {filtered.length} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
