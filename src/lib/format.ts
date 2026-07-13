import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  /** minor-unit digits; IDR/JPY = 0, most = 2 */
  decimals: number;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", decimals: 0 },
  { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  { code: "GBP", symbol: "£", name: "British Pound", decimals: 2 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimals: 2 },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", decimals: 2 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", decimals: 2 },
];

const currencyByCode = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currencyMeta(code: string): CurrencyMeta {
  return (
    currencyByCode.get(code) ?? {
      code,
      symbol: code,
      name: code,
      decimals: 2,
    }
  );
}

/**
 * Format money. Uses Intl.NumberFormat with a graceful fallback so we never
 * throw on an unknown currency/locale in a locked-down environment.
 */
export function formatMoney(
  amount: number,
  currency = "IDR",
  locale = "en-US",
  opts: { signed?: boolean; compact?: boolean } = {},
): string {
  const meta = currencyMeta(currency);
  const sign = opts.signed && amount > 0 ? "+" : "";
  try {
    const nf = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
      notation: opts.compact ? "compact" : "standard",
    });
    return sign + nf.format(amount);
  } catch {
    const n = amount.toFixed(meta.decimals);
    return `${sign}${meta.symbol}${n}`;
  }
}

/** Format only the number part (no symbol) for inputs & compact displays. */
export function formatNumber(amount: number, currency = "IDR", locale = "en-US") {
  const meta = currencyMeta(currency);
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(amount);
  } catch {
    return amount.toFixed(meta.decimals);
  }
}

/** Parse a user-typed amount string ("1.250,50" / "1,250.50" / "Rp 1.000"). */
export function parseAmount(input: string): number {
  if (!input) return 0;
  let s = input.replace(/[^0-9.,-]/g, "").trim();
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  // Whichever separator comes last is treated as the decimal separator.
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function toDate(iso: string): Date {
  try {
    return parseISO(iso);
  } catch {
    return new Date(iso);
  }
}

export function formatDate(iso: string, pattern = "MMM d, yyyy"): string {
  try {
    return format(toDate(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatTime(iso: string): string {
  return formatDate(iso, "HH:mm");
}

export function formatDateTime(iso: string): string {
  return formatDate(iso, "MMM d, yyyy · HH:mm");
}

/** "Today", "Yesterday", or a friendly date — for list section headers. */
export function friendlyDay(iso: string): string {
  const d = toDate(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(toDate(iso), { addSuffix: true });
  } catch {
    return formatDate(iso);
  }
}
