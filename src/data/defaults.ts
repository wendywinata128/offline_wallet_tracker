import type {
  AppData,
  AppSettings,
  Category,
  Profile,
  Wallet,
} from "@/types";
import { uid } from "@/lib/utils";

export const APP_VERSION = "1.0.0";
export const SCHEMA_VERSION = 1;

export function defaultCategories(): Category[] {
  const defs: Array<Omit<Category, "id" | "order">> = [
    { name: "Food & Drink", icon: "utensils", color: "orange", kind: "expense", system: true },
    { name: "Transport", icon: "car", color: "blue", kind: "expense", system: true },
    { name: "Shopping", icon: "shopping-bag", color: "pink", kind: "expense", system: true },
    { name: "Entertainment", icon: "film", color: "violet", kind: "expense", system: true },
    { name: "Bills & Utilities", icon: "receipt", color: "amber", kind: "expense", system: true },
    { name: "Health", icon: "health", color: "red", kind: "expense", system: true },
    { name: "Education", icon: "education", color: "cyan", kind: "expense", system: true },
    { name: "Travel", icon: "plane", color: "sky", kind: "expense", system: true },
    { name: "Housing", icon: "home", color: "teal", kind: "expense", system: true },
    { name: "Salary", icon: "briefcase", color: "emerald", kind: "income", system: true },
    { name: "Investment", icon: "trending-up", color: "green", kind: "both", system: true },
    { name: "Gift", icon: "gift", color: "fuchsia", kind: "both", system: true },
    { name: "Others", icon: "more", color: "slate", kind: "both", system: true },
  ];
  return defs.map((d, i) => ({ ...d, id: uid("cat"), order: i }));
}

export function defaultWallets(currency: string, now: string): Wallet[] {
  const base = {
    initialBalance: 0,
    currency,
    order: 0,
    pinned: false,
    favorite: false,
    archived: false,
    excludeFromTotal: false,
    createdAt: now,
    updatedAt: now,
  };
  const defs: Array<Pick<Wallet, "name" | "type" | "icon" | "color"> & { pinned?: boolean }> = [
    { name: "Cash", type: "cash", icon: "banknote", color: "emerald", pinned: true },
  ];
  return defs.map((d, i) => ({
    ...base,
    ...d,
    id: uid("wal"),
    order: i,
    pinned: d.pinned ?? false,
  }));
}

export function defaultSettings(): AppSettings {
  return {
    appearance: {
      theme: "system",
      accent: "indigo",
      radius: "md",
      compact: false,
      animations: true,
    },
    preferences: {
      privacyMode: false,
      defaultWalletId: null,
      walletSort: "manual",
    },
  };
}

export function defaultProfile(): Profile {
  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  return {
    name: "Me",
    currency: "IDR",
    locale: "en-US",
    timezone: timezone || "UTC",
  };
}

/** A fresh, seeded database for first-run or after a reset. */
export function createInitialData(now: string): AppData {
  const profile = defaultProfile();
  const wallets = defaultWallets(profile.currency, now);
  return {
    wallets,
    transactions: [],
    categories: defaultCategories(),
    budgets: [],
    templates: [],
    recurring: [],
    settings: defaultSettings(),
    profile,
    meta: {
      version: SCHEMA_VERSION,
      createdAt: now,
      lastModified: now,
      appVersion: APP_VERSION,
    },
  };
}

/** An empty database (no wallets) — used when the user clears all data. */
export function createEmptyData(now: string): AppData {
  const profile = defaultProfile();
  return {
    wallets: [],
    transactions: [],
    categories: defaultCategories(),
    budgets: [],
    templates: [],
    recurring: [],
    settings: defaultSettings(),
    profile,
    meta: {
      version: SCHEMA_VERSION,
      createdAt: now,
      lastModified: now,
      appVersion: APP_VERSION,
    },
  };
}
