/**
 * Domain model for Wallet Tracker.
 *
 * Design note: balances are NEVER stored on the wallet. They are always
 * derived from the transaction ledger (see store/selectors.ts). This makes
 * it impossible for a stored balance to drift out of sync with reality.
 */

export type ID = string;

/** ISO 8601 date-time string, e.g. "2026-07-13T09:30:00.000Z" */
export type ISODateTime = string;

export type TransactionType = "income" | "expense" | "transfer";

export type WalletType =
  | "cash"
  | "bank"
  | "ewallet"
  | "credit"
  | "savings"
  | "investment"
  | "other";

export interface Wallet {
  id: ID;
  name: string;
  type: WalletType;
  /** lucide icon key — see data/icons.ts */
  icon: string;
  /** color token key — see data/palette.ts */
  color: string;
  /** optional opening balance recorded as a synthetic ledger entry */
  initialBalance: number;
  currency: string;
  note?: string;
  /** manual ordering index for drag/reorder */
  order: number;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  /** exclude from net-worth totals (e.g. credit lines you don't count) */
  excludeFromTotal: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Category {
  id: ID;
  name: string;
  icon: string;
  color: string;
  /** which flows this category is offered for */
  kind: "income" | "expense" | "both";
  /** default categories cannot be deleted, only hidden */
  system: boolean;
  order: number;
}

export interface Attachment {
  id: ID;
  name: string;
  /** MIME type */
  type: string;
  /** base64 data URL */
  dataUrl: string;
  size: number;
}

export interface Transaction {
  id: ID;
  type: TransactionType;
  /** always a positive number; sign is implied by `type` */
  amount: number;
  /** owning wallet (source wallet for transfers) */
  walletId: ID;
  /** destination wallet — transfers only */
  toWalletId?: ID;
  categoryId?: ID;
  description: string;
  notes?: string;
  tags: string[];
  /** ISO date-time (date + time combined) */
  date: ISODateTime;
  attachments?: Attachment[];
  /** links a materialized transaction back to its recurring rule */
  recurringId?: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringRule {
  id: ID;
  /** template fields used to materialize a transaction */
  type: TransactionType;
  amount: number;
  walletId: ID;
  toWalletId?: ID;
  categoryId?: ID;
  description: string;
  notes?: string;
  tags: string[];
  frequency: RecurrenceFrequency;
  /** every N periods (e.g. every 2 weeks) */
  interval: number;
  startDate: ISODateTime;
  /** null = no end */
  endDate: ISODateTime | null;
  /** last date we materialized up to */
  lastRun: ISODateTime | null;
  active: boolean;
  createdAt: ISODateTime;
}

export interface TransactionTemplate {
  id: ID;
  name: string;
  type: TransactionType;
  amount?: number;
  walletId?: ID;
  toWalletId?: ID;
  categoryId?: ID;
  description: string;
  tags: string[];
  createdAt: ISODateTime;
}

export interface Budget {
  id: ID;
  /** null = overall/global budget across all expense categories */
  categoryId: ID | null;
  /** monthly limit */
  amount: number;
  period: "monthly";
  createdAt: ISODateTime;
}

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor =
  | "indigo"
  | "violet"
  | "blue"
  | "emerald"
  | "rose"
  | "amber"
  | "teal";
export type RadiusPref = "none" | "sm" | "md" | "lg";

export interface AppearanceSettings {
  theme: ThemeMode;
  accent: AccentColor;
  radius: RadiusPref;
  compact: boolean;
  animations: boolean;
}

export interface Profile {
  name: string;
  /** base64 data URL */
  avatar?: string;
  currency: string;
  locale: string;
  timezone: string;
}

export interface Preferences {
  /** hide all monetary values behind •••• */
  privacyMode: boolean;
  /** default wallet preselected in the transaction form */
  defaultWalletId: ID | null;
  /** wallet sorting on the dashboard */
  walletSort: "manual" | "name" | "balance" | "recent";
}

export interface AppSettings {
  appearance: AppearanceSettings;
  preferences: Preferences;
}

export interface AppMeta {
  version: number;
  createdAt: ISODateTime;
  lastModified: ISODateTime;
  /** app version string that last wrote the data */
  appVersion: string;
}

export interface AppData {
  wallets: Wallet[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  templates: TransactionTemplate[];
  recurring: RecurringRule[];
  settings: AppSettings;
  profile: Profile;
  meta: AppMeta;
}

/** The full serialized export/import envelope. */
export interface ExportEnvelope {
  kind: "wallet-tracker-backup";
  version: number;
  exportedAt: ISODateTime;
  data: AppData;
}

/**
 * A profile is a completely independent saved dataset (its own wallets,
 * transactions, categories, settings…). Users switch between profiles like
 * separate accounts — "Profile 1", "Profile 2", etc.
 */
export interface StoredProfile {
  id: ID;
  name: string;
  createdAt: ISODateTime;
  data: AppData;
}

/** The top-level persisted container: all profiles + the active one. */
export interface Workspace {
  version: number;
  savedAt: ISODateTime;
  activeId: ID;
  profiles: StoredProfile[];
}

/** Lightweight profile metadata exposed to the UI (no heavy data payload). */
export interface ProfileSummary {
  id: ID;
  name: string;
  createdAt: ISODateTime;
  active: boolean;
}

/* ---------- Derived / view-model types ---------- */

export interface WalletComputed {
  wallet: Wallet;
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  lastTransaction: Transaction | null;
}

export interface DashboardTotals {
  totalAssets: number;
  netWorth: number;
  todaySpending: number;
  monthSpending: number;
  monthIncome: number;
  walletCount: number;
}
