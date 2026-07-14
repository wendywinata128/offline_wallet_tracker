import type {
  AppData,
  Budget,
  Category,
  RecurringRule,
  Transaction,
  TransactionTemplate,
  Wallet,
  AppearanceSettings,
  Preferences,
  Profile,
  ProfileSummary,
  StoredProfile,
  Workspace,
} from "@/types";
import { uid } from "@/lib/utils";
import { storage } from "@/storage/storage";
import { normalizeAppData } from "@/storage/validate";
import { createEmptyData } from "@/data/defaults";
import { materializeDueRecurring } from "./recurring";

type Listener = () => void;

function nowISO() {
  return new Date().toISOString();
}

/**
 * Observable app store. Immutable updates + a subscription model designed for
 * React's useSyncExternalStore. The store never mutates state in place, so
 * selector memoization by reference works correctly.
 */
class Store {
  private workspace: Workspace;
  private state: AppData; // active profile's data (kept in sync into workspace)
  private profilesSnapshot: ProfileSummary[];
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.workspace = storage.load();
    this.state = this.activeProfile().data;
    this.profilesSnapshot = this.buildProfilesSnapshot();

    // Materialize any recurring transactions that came due while away.
    const materialized = materializeDueRecurring(this.state, nowISO());
    if (materialized) {
      this.state = materialized;
      this.commitActive();
      this.persist();
    }
    // Flush pending writes before the tab closes.
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.flush());
    }
  }

  private activeProfile(): StoredProfile {
    return (
      this.workspace.profiles.find((p) => p.id === this.workspace.activeId) ??
      this.workspace.profiles[0]
    );
  }

  private buildProfilesSnapshot(): ProfileSummary[] {
    return this.workspace.profiles.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      active: p.id === this.workspace.activeId,
    }));
  }

  /** Write the current active `state` back into the workspace profile list. */
  private commitActive() {
    this.workspace = {
      ...this.workspace,
      profiles: this.workspace.profiles.map((p) =>
        p.id === this.workspace.activeId ? { ...p, data: this.state } : p,
      ),
    };
  }

  getState = (): AppData => this.state;

  /** Stable snapshot of profile metadata for the switcher UI. */
  getProfiles = (): ProfileSummary[] => this.profilesSnapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private set(next: AppData) {
    this.state = { ...next, meta: { ...next.meta, lastModified: nowISO() } };
    this.commitActive();
    this.emit();
    this.persist();
  }

  /** Debounced write; heavy edits (typing) collapse into one save. */
  private persist() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      storage.save(this.workspace);
      this.saveTimer = null;
    }, 200);
  }

  flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    storage.save(this.workspace);
  }

  /* ------------------------------ Profiles ----------------------------- */

  /** Create a fresh profile (its own dataset) and switch to it. */
  createProfile(name?: string): string {
    const now = nowISO();
    const id = storage.newProfileId();
    const profile: StoredProfile = {
      id,
      name: name?.trim() || `Profile ${this.workspace.profiles.length + 1}`,
      createdAt: now,
      data: storage.freshData(),
    };
    this.workspace = {
      ...this.workspace,
      profiles: [...this.workspace.profiles, profile],
      activeId: id,
    };
    this.state = profile.data;
    this.profilesSnapshot = this.buildProfilesSnapshot();
    this.emit();
    this.persist();
    return id;
  }

  /** Switch the active profile, loading its entire dataset. */
  switchProfile(id: string) {
    if (id === this.workspace.activeId) return;
    const target = this.workspace.profiles.find((p) => p.id === id);
    if (!target) return;
    this.workspace = { ...this.workspace, activeId: id };
    this.state = target.data;
    const materialized = materializeDueRecurring(this.state, nowISO());
    if (materialized) {
      this.state = materialized;
      this.commitActive();
    }
    this.profilesSnapshot = this.buildProfilesSnapshot();
    this.emit();
    this.persist();
  }

  renameProfile(id: string, name: string) {
    const n = name.trim();
    if (!n) return;
    this.workspace = {
      ...this.workspace,
      profiles: this.workspace.profiles.map((p) =>
        p.id === id ? { ...p, name: n } : p,
      ),
    };
    this.profilesSnapshot = this.buildProfilesSnapshot();
    this.emit();
    this.persist();
  }

  /** Delete a profile. No-op if it's the last one remaining. */
  deleteProfile(id: string) {
    if (this.workspace.profiles.length <= 1) return;
    const remaining = this.workspace.profiles.filter((p) => p.id !== id);
    const activeId =
      this.workspace.activeId === id ? remaining[0].id : this.workspace.activeId;
    this.workspace = { ...this.workspace, profiles: remaining, activeId };
    this.state = (remaining.find((p) => p.id === activeId) ?? remaining[0]).data;
    this.profilesSnapshot = this.buildProfilesSnapshot();
    this.emit();
    this.persist();
  }

  /* ------------------------------ Wallets ------------------------------ */

  addWallet(
    input: Omit<Wallet, "id" | "order" | "createdAt" | "updatedAt" | "pinned" | "favorite" | "archived" | "excludeFromTotal"> &
      Partial<Pick<Wallet, "pinned" | "favorite" | "archived" | "excludeFromTotal">>,
  ): Wallet {
    const now = nowISO();
    const maxOrder = Math.max(-1, ...this.state.wallets.map((w) => w.order));
    const wallet: Wallet = {
      pinned: false,
      favorite: false,
      archived: false,
      excludeFromTotal: false,
      ...input,
      id: uid("wal"),
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    this.set({ ...this.state, wallets: [...this.state.wallets, wallet] });
    return wallet;
  }

  updateWallet(id: string, patch: Partial<Wallet>) {
    this.set({
      ...this.state,
      wallets: this.state.wallets.map((w) =>
        w.id === id ? { ...w, ...patch, id: w.id, updatedAt: nowISO() } : w,
      ),
    });
  }

  /** Removes the wallet and all transactions referencing it. Returns them for undo. */
  deleteWallet(id: string): { wallet: Wallet; transactions: Transaction[] } | null {
    const wallet = this.state.wallets.find((w) => w.id === id);
    if (!wallet) return null;
    const affected = this.state.transactions.filter(
      (t) => t.walletId === id || t.toWalletId === id,
    );
    this.set({
      ...this.state,
      wallets: this.state.wallets.filter((w) => w.id !== id),
      transactions: this.state.transactions.filter(
        (t) => t.walletId !== id && t.toWalletId !== id,
      ),
      recurring: this.state.recurring.filter(
        (r) => r.walletId !== id && r.toWalletId !== id,
      ),
      settings: {
        ...this.state.settings,
        preferences: {
          ...this.state.settings.preferences,
          defaultWalletId:
            this.state.settings.preferences.defaultWalletId === id
              ? null
              : this.state.settings.preferences.defaultWalletId,
        },
      },
    });
    return { wallet, transactions: affected };
  }

  restoreWallet(wallet: Wallet, transactions: Transaction[]) {
    this.set({
      ...this.state,
      wallets: [...this.state.wallets, wallet],
      transactions: [...this.state.transactions, ...transactions],
    });
  }

  reorderWallets(orderedIds: string[]) {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    this.set({
      ...this.state,
      wallets: this.state.wallets.map((w) => ({
        ...w,
        order: orderMap.get(w.id) ?? w.order,
      })),
    });
  }

  /* ---------------------------- Transactions --------------------------- */

  addTransaction(
    input: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Transaction {
    const now = nowISO();
    const txn: Transaction = {
      ...input,
      amount: Math.abs(input.amount),
      id: uid("txn"),
      createdAt: now,
      updatedAt: now,
    };
    this.set({ ...this.state, transactions: [txn, ...this.state.transactions] });
    return txn;
  }

  updateTransaction(id: string, patch: Partial<Transaction>) {
    this.set({
      ...this.state,
      transactions: this.state.transactions.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              id: t.id,
              amount: patch.amount != null ? Math.abs(patch.amount) : t.amount,
              updatedAt: nowISO(),
            }
          : t,
      ),
    });
  }

  deleteTransaction(id: string): Transaction | null {
    const txn = this.state.transactions.find((t) => t.id === id) ?? null;
    if (!txn) return null;
    this.set({
      ...this.state,
      transactions: this.state.transactions.filter((t) => t.id !== id),
    });
    return txn;
  }

  restoreTransaction(txn: Transaction) {
    this.set({
      ...this.state,
      transactions: [txn, ...this.state.transactions.filter((t) => t.id !== txn.id)],
    });
  }

  duplicateTransaction(id: string): Transaction | null {
    const txn = this.state.transactions.find((t) => t.id === id);
    if (!txn) return null;
    return this.addTransaction({
      ...txn,
      date: nowISO(),
      description: txn.description,
    });
  }

  /* ----------------------------- Categories ---------------------------- */

  addCategory(input: Omit<Category, "id" | "order" | "system">): Category {
    const maxOrder = Math.max(-1, ...this.state.categories.map((c) => c.order));
    const category: Category = {
      ...input,
      id: uid("cat"),
      order: maxOrder + 1,
      system: false,
    };
    this.set({ ...this.state, categories: [...this.state.categories, category] });
    return category;
  }

  updateCategory(id: string, patch: Partial<Category>) {
    this.set({
      ...this.state,
      categories: this.state.categories.map((c) =>
        c.id === id ? { ...c, ...patch, id: c.id, system: c.system } : c,
      ),
    });
  }

  deleteCategory(id: string): Category | null {
    const category = this.state.categories.find((c) => c.id === id) ?? null;
    if (!category) return null;
    this.set({
      ...this.state,
      categories: this.state.categories.filter((c) => c.id !== id),
      // Orphan the transactions rather than deleting them.
      transactions: this.state.transactions.map((t) =>
        t.categoryId === id ? { ...t, categoryId: undefined } : t,
      ),
      budgets: this.state.budgets.filter((b) => b.categoryId !== id),
    });
    return category;
  }

  /* ------------------------------ Budgets ------------------------------ */

  upsertBudget(categoryId: string | null, amount: number): Budget {
    const existing = this.state.budgets.find((b) => b.categoryId === categoryId);
    if (existing) {
      const updated = { ...existing, amount: Math.abs(amount) };
      this.set({
        ...this.state,
        budgets: this.state.budgets.map((b) => (b.id === existing.id ? updated : b)),
      });
      return updated;
    }
    const budget: Budget = {
      id: uid("bud"),
      categoryId,
      amount: Math.abs(amount),
      period: "monthly",
      createdAt: nowISO(),
    };
    this.set({ ...this.state, budgets: [...this.state.budgets, budget] });
    return budget;
  }

  deleteBudget(id: string) {
    this.set({
      ...this.state,
      budgets: this.state.budgets.filter((b) => b.id !== id),
    });
  }

  /* ----------------------------- Templates ----------------------------- */

  addTemplate(input: Omit<TransactionTemplate, "id" | "createdAt">): TransactionTemplate {
    const template: TransactionTemplate = {
      ...input,
      id: uid("tpl"),
      createdAt: nowISO(),
    };
    this.set({ ...this.state, templates: [...this.state.templates, template] });
    return template;
  }

  deleteTemplate(id: string) {
    this.set({
      ...this.state,
      templates: this.state.templates.filter((t) => t.id !== id),
    });
  }

  /* ----------------------------- Recurring ----------------------------- */

  addRecurring(input: Omit<RecurringRule, "id" | "createdAt" | "lastRun">): RecurringRule {
    const rule: RecurringRule = {
      ...input,
      id: uid("rec"),
      lastRun: null,
      createdAt: nowISO(),
    };
    let next: AppData = { ...this.state, recurring: [...this.state.recurring, rule] };
    next = materializeDueRecurring(next, nowISO()) ?? next;
    this.set(next);
    return rule;
  }

  updateRecurring(id: string, patch: Partial<RecurringRule>) {
    this.set({
      ...this.state,
      recurring: this.state.recurring.map((r) =>
        r.id === id ? { ...r, ...patch, id: r.id } : r,
      ),
    });
  }

  deleteRecurring(id: string) {
    this.set({
      ...this.state,
      recurring: this.state.recurring.filter((r) => r.id !== id),
    });
  }

  /* --------------------------- Settings/Profile ------------------------ */

  updateAppearance(patch: Partial<AppearanceSettings>) {
    this.set({
      ...this.state,
      settings: {
        ...this.state.settings,
        appearance: { ...this.state.settings.appearance, ...patch },
      },
    });
  }

  updatePreferences(patch: Partial<Preferences>) {
    this.set({
      ...this.state,
      settings: {
        ...this.state.settings,
        preferences: { ...this.state.settings.preferences, ...patch },
      },
    });
  }

  updateProfile(patch: Partial<Profile>) {
    this.set({ ...this.state, profile: { ...this.state.profile, ...patch } });
  }

  togglePrivacy() {
    this.updatePreferences({ privacyMode: !this.state.settings.preferences.privacyMode });
  }

  /* ------------------------------- Data -------------------------------- */

  /** Replace the entire dataset (used by JSON import). Input is normalized. */
  importData(raw: unknown) {
    const data = normalizeAppData(raw, nowISO());
    this.set(data);
  }

  /** Clear the ACTIVE profile's data (keeps other profiles intact). */
  clearAllData() {
    this.set(createEmptyData(nowISO()));
  }

  /** Wipe ALL profiles and start over with a single fresh profile. */
  resetApp() {
    storage.clearAll();
    this.workspace = storage.load();
    this.state = this.activeProfile().data;
    this.profilesSnapshot = this.buildProfilesSnapshot();
    this.emit();
  }
}

export const store = new Store();
