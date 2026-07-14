import { useSyncExternalStore, useMemo } from "react";
import { store } from "./store";
import type { AppData } from "@/types";
import {
  computeAllWallets,
  computeTotals,
  computeWallet,
  transactionsForWallet,
} from "./selectors";

/** Subscribe a component to the whole app dataset. */
export function useData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/** Actions object — stable identity, safe to omit from dep arrays. */
export function useActions() {
  return store;
}

export function useWallets() {
  const data = useData();
  return useMemo(
    () => [...data.wallets].sort((a, b) => a.order - b.order),
    [data.wallets],
  );
}

export function useComputedWallets() {
  const data = useData();
  return useMemo(() => computeAllWallets(data), [data.wallets, data.transactions]);
}

export function useTotals() {
  const data = useData();
  return useMemo(() => computeTotals(data), [data.wallets, data.transactions]);
}

export function useWallet(id: string | undefined) {
  const data = useData();
  return useMemo(() => {
    const wallet = data.wallets.find((w) => w.id === id);
    if (!wallet) return null;
    return {
      wallet,
      computed: computeWallet(wallet, data.transactions),
      transactions: transactionsForWallet(data.transactions, wallet.id),
    };
  }, [data.wallets, data.transactions, id]);
}

export function useCategories() {
  const data = useData();
  return useMemo(
    () => [...data.categories].sort((a, b) => a.order - b.order),
    [data.categories],
  );
}

export function useCategoryMap() {
  const data = useData();
  return useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
}

export function useWalletMap() {
  const data = useData();
  return useMemo(() => new Map(data.wallets.map((w) => [w.id, w])), [data.wallets]);
}

export function useSettings() {
  return useData().settings;
}

export function useProfile() {
  return useData().profile;
}

/** Profile switcher metadata (id, name, active). Independent of the dataset. */
export function useProfiles() {
  return useSyncExternalStore(store.subscribe, store.getProfiles, store.getProfiles);
}

