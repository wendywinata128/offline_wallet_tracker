import { useEffect, useMemo, useState } from "react";
import { Clock, Search as SearchIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { TransactionItem } from "@/features/transactions/TransactionItem";
import { useData } from "@/store/hooks";
import { useDebounce } from "@/hooks/use-debounce";
import {
  buildSearchIndex,
  recentSearches,
  recordSearch,
  searchTransactions,
} from "./search";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: Props) {
  const data = useData();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 180);

  const index = useMemo(() => buildSearchIndex(data), [data]);
  const results = useMemo(
    () => searchTransactions(index, debounced),
    [index, debounced],
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (debounced.trim().length > 1) recordSearch(debounced);
  }, [debounced]);

  const recents = recentSearches();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Search transactions</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search description, amount, tag, category, wallet, date…"
            className="h-12 border-0 px-1 text-base shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            recents.length ? (
              <div className="p-2">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent searches
                </p>
                {recents.map((r) => (
                  <button
                    key={r}
                    onClick={() => setQuery(r)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {r}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Start typing to search your entire ledger.
              </div>
            )
          ) : results.length ? (
            <>
              <p className="px-3 py-1.5 text-xs text-muted-foreground">
                {results.length} result{results.length === 1 ? "" : "s"}
              </p>
              {results.map((txn) => (
                <div key={txn.id} onClick={() => onOpenChange(false)}>
                  <TransactionItem txn={txn} showWallet />
                </div>
              ))}
            </>
          ) : (
            <EmptyState
              icon={SearchIcon}
              title="No matches"
              description={`Nothing found for "${query}".`}
              className="border-0 bg-transparent py-10"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
