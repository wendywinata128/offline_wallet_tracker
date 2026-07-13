import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Transaction, Wallet } from "@/types";
import { TransactionForm, type TransactionPrefill } from "@/features/transactions/TransactionForm";
import { WalletForm } from "@/features/wallets/WalletForm";
import { SearchDialog } from "@/features/search/SearchDialog";

interface UIContextValue {
  /** Open the transaction editor. Pass an existing txn to edit, or a prefill to seed a new one. */
  openTransaction: (opts?: {
    edit?: Transaction | null;
    prefill?: TransactionPrefill;
  }) => void;
  openWallet: (edit?: Wallet | null) => void;
  openSearch: () => void;
  closeSearch: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [txnOpen, setTxnOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [prefill, setPrefill] = useState<TransactionPrefill | undefined>();

  const [walletOpen, setWalletOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);

  const openTransaction = useCallback<UIContextValue["openTransaction"]>((opts) => {
    setEditingTxn(opts?.edit ?? null);
    setPrefill(opts?.prefill);
    setTxnOpen(true);
  }, []);

  const openWallet = useCallback<UIContextValue["openWallet"]>((edit) => {
    setEditingWallet(edit ?? null);
    setWalletOpen(true);
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const value = useMemo(
    () => ({ openTransaction, openWallet, openSearch, closeSearch }),
    [openTransaction, openWallet, openSearch, closeSearch],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      <TransactionForm
        open={txnOpen}
        onOpenChange={setTxnOpen}
        editing={editingTxn}
        prefill={prefill}
      />
      <WalletForm open={walletOpen} onOpenChange={setWalletOpen} editing={editingWallet} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </UIContext.Provider>
  );
}
