import { useCallback } from "react";
import type { Transaction } from "@/types";
import { useActions } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * Shared transaction mutations wired to toast feedback and undo. Centralizes
 * the undo-delete pattern so every list behaves identically.
 */
export function useTransactionActions() {
  const actions = useActions();
  const { toast } = useToast();

  const remove = useCallback(
    (txn: Transaction) => {
      const deleted = actions.deleteTransaction(txn.id);
      if (!deleted) return;
      toast({
        title: "Transaction deleted",
        description: txn.description || "Removed from your ledger.",
        action: (
          <ToastAction altText="Undo delete" onClick={() => actions.restoreTransaction(deleted)}>
            Undo
          </ToastAction>
        ),
      });
    },
    [actions, toast],
  );

  const duplicate = useCallback(
    (txn: Transaction) => {
      const copy = actions.duplicateTransaction(txn.id);
      if (copy) toast({ title: "Transaction duplicated" });
    },
    [actions, toast],
  );

  return { remove, duplicate };
}
