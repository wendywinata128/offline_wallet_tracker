import type { AppData, ExportEnvelope, Transaction } from "@/types";
import { SCHEMA_VERSION } from "@/data/defaults";
import { download } from "./utils";

/* ------------------------------- JSON -------------------------------- */

export function buildExportEnvelope(data: AppData): ExportEnvelope {
  return {
    kind: "wallet-tracker-backup",
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function exportJSON(data: AppData) {
  const envelope = buildExportEnvelope(data);
  const stamp = new Date().toISOString().slice(0, 10);
  download(
    `wallet-tracker-backup-${stamp}.json`,
    JSON.stringify(envelope, null, 2),
    "application/json",
  );
}

/** Accepts either a raw AppData object or an ExportEnvelope. Returns raw data. */
export function parseImportedJSON(text: string): unknown {
  const parsed = JSON.parse(text) as unknown;
  if (
    parsed &&
    typeof parsed === "object" &&
    "data" in parsed &&
    (parsed as { kind?: string }).kind === "wallet-tracker-backup"
  ) {
    return (parsed as ExportEnvelope).data;
  }
  return parsed;
}

/* -------------------------------- CSV -------------------------------- */

function csvEscape(value: string | number | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_HEADERS = [
  "date",
  "type",
  "amount",
  "wallet",
  "toWallet",
  "category",
  "description",
  "tags",
  "notes",
] as const;

export function exportTransactionsCSV(data: AppData) {
  const walletName = new Map(data.wallets.map((w) => [w.id, w.name]));
  const catName = new Map(data.categories.map((c) => [c.id, c.name]));

  const rows = data.transactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) =>
      [
        t.date,
        t.type,
        t.amount,
        walletName.get(t.walletId) ?? t.walletId,
        t.toWalletId ? walletName.get(t.toWalletId) ?? t.toWalletId : "",
        t.categoryId ? catName.get(t.categoryId) ?? "" : "",
        t.description,
        t.tags.join("; "),
        t.notes ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );

  const csv = [CSV_HEADERS.join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  download(`wallet-tracker-transactions-${stamp}.csv`, csv, "text/csv;charset=utf-8");
}

/** Minimal RFC-4180-ish CSV line parser (handles quotes and commas). */
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export interface CSVImportResult {
  imported: Omit<Transaction, "id" | "createdAt" | "updatedAt">[];
  skipped: number;
}

/**
 * Parse a transactions CSV against the current dataset, resolving wallet and
 * category NAMES back to ids. Rows referencing unknown wallets are skipped.
 */
export function parseTransactionsCSV(text: string, data: AppData): CSVImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { imported: [], skipped: 0 };

  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);

  const walletByName = new Map(
    data.wallets.map((w) => [w.name.toLowerCase(), w.id]),
  );
  const catByName = new Map(data.categories.map((c) => [c.name.toLowerCase(), c.id]));

  const imported: CSVImportResult["imported"] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const get = (name: string) => {
      const idx = col(name);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };

    const walletId = walletByName.get(get("wallet").toLowerCase());
    if (!walletId) {
      skipped += 1;
      continue;
    }
    const rawType = get("type").toLowerCase();
    const type = (["income", "expense", "transfer"] as const).includes(
      rawType as never,
    )
      ? (rawType as Transaction["type"])
      : "expense";
    const amount = Math.abs(parseFloat(get("amount").replace(/[^0-9.-]/g, "")) || 0);
    const dateStr = get("date");
    const parsedDate = Date.parse(dateStr);
    const date = Number.isNaN(parsedDate)
      ? new Date().toISOString()
      : new Date(parsedDate).toISOString();

    const toWalletId =
      type === "transfer"
        ? walletByName.get(get("towallet").toLowerCase())
        : undefined;

    imported.push({
      type,
      amount,
      walletId,
      toWalletId,
      categoryId: catByName.get(get("category").toLowerCase()),
      description: get("description"),
      notes: get("notes") || undefined,
      tags: get("tags")
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      date,
    });
  }

  return { imported, skipped };
}
