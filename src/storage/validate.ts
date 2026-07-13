import type {
  AppData,
  Budget,
  Category,
  RecurringRule,
  Transaction,
  TransactionTemplate,
  Wallet,
} from "@/types";
import {
  APP_VERSION,
  SCHEMA_VERSION,
  createInitialData,
  defaultCategories,
  defaultProfile,
  defaultSettings,
} from "@/data/defaults";

/**
 * Defensive normalization. Rather than reject partially-valid data (which would
 * lose a user's ledger over one bad field), we coerce every record into a safe
 * shape, dropping only irreparable entries. This is the last line of defense
 * against corruption and forward/backward import drift.
 */

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const bool = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const iso = (v: unknown, fallback: string): string => {
  const s = str(v, fallback);
  const t = Date.parse(s);
  return Number.isNaN(t) ? fallback : s;
};

function normalizeWallet(raw: unknown, now: string, index: number): Wallet | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    name: str(raw.name, "Untitled"),
    type: str(raw.type, "other") as Wallet["type"],
    icon: str(raw.icon, "wallet"),
    color: str(raw.color, "indigo"),
    initialBalance: num(raw.initialBalance),
    currency: str(raw.currency, "IDR"),
    note: raw.note ? str(raw.note) : undefined,
    order: num(raw.order, index),
    pinned: bool(raw.pinned),
    favorite: bool(raw.favorite),
    archived: bool(raw.archived),
    excludeFromTotal: bool(raw.excludeFromTotal),
    createdAt: iso(raw.createdAt, now),
    updatedAt: iso(raw.updatedAt, now),
  };
}

function normalizeTransaction(raw: unknown, now: string): Transaction | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const walletId = str(raw.walletId);
  if (!id || !walletId) return null;
  const type = str(raw.type, "expense") as Transaction["type"];
  return {
    id,
    type: (["income", "expense", "transfer"] as const).includes(type)
      ? type
      : "expense",
    amount: Math.abs(num(raw.amount)),
    walletId,
    toWalletId: raw.toWalletId ? str(raw.toWalletId) : undefined,
    categoryId: raw.categoryId ? str(raw.categoryId) : undefined,
    description: str(raw.description),
    notes: raw.notes ? str(raw.notes) : undefined,
    tags: arr<unknown>(raw.tags).map((t) => str(t)).filter(Boolean),
    date: iso(raw.date, now),
    attachments: Array.isArray(raw.attachments)
      ? (raw.attachments as Transaction["attachments"])
      : undefined,
    recurringId: raw.recurringId ? str(raw.recurringId) : undefined,
    createdAt: iso(raw.createdAt, now),
    updatedAt: iso(raw.updatedAt, now),
  };
}

function normalizeCategory(raw: unknown, index: number): Category | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  const kind = str(raw.kind, "both") as Category["kind"];
  return {
    id,
    name: str(raw.name, "Category"),
    icon: str(raw.icon, "more"),
    color: str(raw.color, "slate"),
    kind: (["income", "expense", "both"] as const).includes(kind) ? kind : "both",
    system: bool(raw.system),
    order: num(raw.order, index),
  };
}

function normalizeBudget(raw: unknown, now: string): Budget | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    categoryId: raw.categoryId ? str(raw.categoryId) : null,
    amount: Math.abs(num(raw.amount)),
    period: "monthly",
    createdAt: iso(raw.createdAt, now),
  };
}

function normalizeTemplate(raw: unknown, now: string): TransactionTemplate | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    name: str(raw.name, "Template"),
    type: str(raw.type, "expense") as TransactionTemplate["type"],
    amount: raw.amount != null ? Math.abs(num(raw.amount)) : undefined,
    walletId: raw.walletId ? str(raw.walletId) : undefined,
    toWalletId: raw.toWalletId ? str(raw.toWalletId) : undefined,
    categoryId: raw.categoryId ? str(raw.categoryId) : undefined,
    description: str(raw.description),
    tags: arr<unknown>(raw.tags).map((t) => str(t)).filter(Boolean),
    createdAt: iso(raw.createdAt, now),
  };
}

function normalizeRecurring(raw: unknown, now: string): RecurringRule | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const walletId = str(raw.walletId);
  if (!id || !walletId) return null;
  const freq = str(raw.frequency, "monthly") as RecurringRule["frequency"];
  return {
    id,
    type: str(raw.type, "expense") as RecurringRule["type"],
    amount: Math.abs(num(raw.amount)),
    walletId,
    toWalletId: raw.toWalletId ? str(raw.toWalletId) : undefined,
    categoryId: raw.categoryId ? str(raw.categoryId) : undefined,
    description: str(raw.description),
    notes: raw.notes ? str(raw.notes) : undefined,
    tags: arr<unknown>(raw.tags).map((t) => str(t)).filter(Boolean),
    frequency: (["daily", "weekly", "monthly", "yearly"] as const).includes(freq)
      ? freq
      : "monthly",
    interval: Math.max(1, num(raw.interval, 1)),
    startDate: iso(raw.startDate, now),
    endDate: raw.endDate ? iso(raw.endDate, now) : null,
    lastRun: raw.lastRun ? iso(raw.lastRun, now) : null,
    active: bool(raw.active, true),
    createdAt: iso(raw.createdAt, now),
  };
}

/** Coerce arbitrary parsed JSON into a valid AppData. Never throws. */
export function normalizeAppData(input: unknown, now: string): AppData {
  if (!isObj(input)) return createInitialData(now);

  const defSettings = defaultSettings();
  const defProfile = defaultProfile();

  const settingsRaw = isObj(input.settings) ? input.settings : {};
  const appearanceRaw = isObj(settingsRaw.appearance) ? settingsRaw.appearance : {};
  const prefsRaw = isObj(settingsRaw.preferences) ? settingsRaw.preferences : {};
  const profileRaw = isObj(input.profile) ? input.profile : {};
  const metaRaw = isObj(input.meta) ? input.meta : {};

  const categories = arr<unknown>(input.categories)
    .map((c, i) => normalizeCategory(c, i))
    .filter((c): c is Category => c !== null);

  return {
    wallets: arr<unknown>(input.wallets)
      .map((w, i) => normalizeWallet(w, now, i))
      .filter((w): w is Wallet => w !== null),
    transactions: arr<unknown>(input.transactions)
      .map((t) => normalizeTransaction(t, now))
      .filter((t): t is Transaction => t !== null),
    categories: categories.length ? categories : defaultCategories(),
    budgets: arr<unknown>(input.budgets)
      .map((b) => normalizeBudget(b, now))
      .filter((b): b is Budget => b !== null),
    templates: arr<unknown>(input.templates)
      .map((t) => normalizeTemplate(t, now))
      .filter((t): t is TransactionTemplate => t !== null),
    recurring: arr<unknown>(input.recurring)
      .map((r) => normalizeRecurring(r, now))
      .filter((r): r is RecurringRule => r !== null),
    settings: {
      appearance: {
        theme: str(appearanceRaw.theme, defSettings.appearance.theme) as never,
        accent: str(appearanceRaw.accent, defSettings.appearance.accent) as never,
        radius: str(appearanceRaw.radius, defSettings.appearance.radius) as never,
        compact: bool(appearanceRaw.compact, defSettings.appearance.compact),
        animations: bool(appearanceRaw.animations, defSettings.appearance.animations),
      },
      preferences: {
        privacyMode: bool(prefsRaw.privacyMode, defSettings.preferences.privacyMode),
        defaultWalletId: prefsRaw.defaultWalletId
          ? str(prefsRaw.defaultWalletId)
          : null,
        walletSort: str(prefsRaw.walletSort, defSettings.preferences.walletSort) as never,
      },
    },
    profile: {
      name: str(profileRaw.name, defProfile.name),
      avatar: profileRaw.avatar ? str(profileRaw.avatar) : undefined,
      currency: str(profileRaw.currency, defProfile.currency),
      locale: str(profileRaw.locale, defProfile.locale),
      timezone: str(profileRaw.timezone, defProfile.timezone),
    },
    meta: {
      version: num(metaRaw.version, SCHEMA_VERSION),
      createdAt: iso(metaRaw.createdAt, now),
      lastModified: iso(metaRaw.lastModified, now),
      appVersion: str(metaRaw.appVersion, APP_VERSION),
    },
  };
}
