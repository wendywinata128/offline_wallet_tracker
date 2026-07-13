import { ArrowRightLeft, MoreVertical, Paperclip } from "lucide-react";
import type { Transaction } from "@/types";
import { IconChip } from "@/components/common/IconChip";
import { Money } from "@/components/common/Money";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useCategoryMap, useWalletMap } from "@/store/hooks";
import { useUI } from "@/providers/UIProvider";
import { useTransactionActions } from "./use-transaction-actions";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  txn: Transaction;
  showWallet?: boolean;
  running?: number;
  className?: string;
}

export function TransactionItem({ txn, showWallet, running, className }: Props) {
  const categories = useCategoryMap();
  const wallets = useWalletMap();
  const { openTransaction } = useUI();
  const { remove, duplicate } = useTransactionActions();

  const category = txn.categoryId ? categories.get(txn.categoryId) : undefined;
  const wallet = wallets.get(txn.walletId);
  const toWallet = txn.toWalletId ? wallets.get(txn.toWalletId) : undefined;

  const isTransfer = txn.type === "transfer";
  const isIncome = txn.type === "income";

  const icon = isTransfer ? "banknote" : category?.icon ?? "more";
  const color = isTransfer ? "slate" : category?.color ?? "slate";

  const signedAmount = isIncome ? txn.amount : isTransfer ? txn.amount : -txn.amount;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60",
        className,
      )}
    >
      {isTransfer ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <ArrowRightLeft className="h-5 w-5" />
        </div>
      ) : (
        <IconChip icon={icon} color={color} />
      )}

      <button
        type="button"
        onClick={() => openTransaction({ edit: txn })}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">
              {txn.description || (isTransfer ? "Transfer" : category?.name ?? "Transaction")}
            </p>
            {txn.attachments && txn.attachments.length > 0 && (
              <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatTime(txn.date)}</span>
            {isTransfer ? (
              <span className="truncate">
                · {wallet?.name} → {toWallet?.name}
              </span>
            ) : (
              <>
                {category && <span className="truncate">· {category.name}</span>}
                {showWallet && wallet && (
                  <span className="truncate">· {wallet.name}</span>
                )}
              </>
            )}
            {txn.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="hidden rounded-full bg-secondary px-1.5 py-0.5 text-[10px] sm:inline"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="text-right">
          <Money
            amount={signedAmount}
            signed={!isTransfer}
            colored={!isTransfer}
            className={cn("text-sm font-semibold", isTransfer && "text-foreground")}
          />
          {running != null && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              <Money amount={running} />
            </div>
          )}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="Transaction actions"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openTransaction({ edit: txn })}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicate(txn)}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => remove(txn)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
