import { useProfile, useSettings } from "@/store/hooks";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyProps {
  amount: number;
  className?: string;
  /** show a leading +/- sign */
  signed?: boolean;
  /** compact notation (e.g. 1.2M) */
  compact?: boolean;
  /** color positive green / negative red */
  colored?: boolean;
  /** override currency (defaults to profile currency) */
  currency?: string;
}

/**
 * Central money renderer. Honors privacy mode (masks value), the profile
 * currency/locale, and optional sign/color semantics.
 */
export function Money({
  amount,
  className,
  signed,
  compact,
  colored,
  currency,
}: MoneyProps) {
  const profile = useProfile();
  const { preferences } = useSettings();

  const cur = currency ?? profile.currency;

  if (preferences.privacyMode) {
    return (
      <span className={cn("tabular select-none tracking-widest", className)} aria-label="hidden">
        ••••••
      </span>
    );
  }

  const value = formatMoney(amount, cur, profile.locale, { signed, compact });

  return (
    <span
      className={cn(
        "tabular",
        colored && amount > 0 && "text-success",
        colored && amount < 0 && "text-destructive",
        className,
      )}
    >
      {value}
    </span>
  );
}
