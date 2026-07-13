import type { AppData, RecurringRule, Transaction } from "@/types";
import { addDays, addMonths, addWeeks, addYears, isAfter, isBefore } from "date-fns";
import { uid } from "@/lib/utils";
import { toDate } from "@/lib/format";

function advance(date: Date, rule: RecurringRule): Date {
  switch (rule.frequency) {
    case "daily":
      return addDays(date, rule.interval);
    case "weekly":
      return addWeeks(date, rule.interval);
    case "monthly":
      return addMonths(date, rule.interval);
    case "yearly":
      return addYears(date, rule.interval);
  }
}

const MAX_CATCHUP = 366; // safety cap against pathological loops

/**
 * Materialize any recurring rule occurrences that are due up to `nowISO`.
 * Pure: returns a new AppData if anything was generated, else null.
 */
export function materializeDueRecurring(data: AppData, nowISO: string): AppData | null {
  const now = toDate(nowISO);
  const generated: Transaction[] = [];
  let changed = false;

  const recurring = data.recurring.map((rule) => {
    if (!rule.active) return rule;

    const start = toDate(rule.startDate);
    let cursor = rule.lastRun ? advance(toDate(rule.lastRun), rule) : start;
    const end = rule.endDate ? toDate(rule.endDate) : null;
    let lastRun = rule.lastRun ? toDate(rule.lastRun) : null;
    let iterations = 0;

    while (!isAfter(cursor, now) && iterations < MAX_CATCHUP) {
      if (end && isAfter(cursor, end)) break;
      if (isBefore(cursor, start)) {
        cursor = advance(cursor, rule);
        iterations += 1;
        continue;
      }
      const stamp = cursor.toISOString();
      generated.push({
        id: uid("txn"),
        type: rule.type,
        amount: Math.abs(rule.amount),
        walletId: rule.walletId,
        toWalletId: rule.toWalletId,
        categoryId: rule.categoryId,
        description: rule.description,
        notes: rule.notes,
        tags: rule.tags,
        date: stamp,
        recurringId: rule.id,
        createdAt: nowISO,
        updatedAt: nowISO,
      });
      lastRun = cursor;
      cursor = advance(cursor, rule);
      iterations += 1;
      changed = true;
    }

    return lastRun ? { ...rule, lastRun: lastRun.toISOString() } : rule;
  });

  if (!changed) return null;

  return {
    ...data,
    recurring,
    transactions: [...generated, ...data.transactions],
  };
}
