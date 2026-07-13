import * as React from "react";
import { Input } from "@/components/ui/input";
import { currencyMeta, formatNumber, parseAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency: string;
  locale?: string;
  className?: string;
  autoFocus?: boolean;
  id?: string;
}

/**
 * A currency-aware amount field. Keeps a raw text buffer while focused so the
 * user can type freely, then reformats on blur. Emits a parsed number.
 */
export function AmountInput({
  value,
  onChange,
  currency,
  locale = "en-US",
  className,
  autoFocus,
  id,
}: AmountInputProps) {
  const meta = currencyMeta(currency);
  const [focused, setFocused] = React.useState(false);
  const [text, setText] = React.useState(() =>
    value ? formatNumber(value, currency, locale) : "",
  );

  React.useEffect(() => {
    if (!focused) setText(value ? formatNumber(value, currency, locale) : "");
  }, [value, focused, currency, locale]);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        {meta.symbol}
      </span>
      <Input
        id={id}
        inputMode="decimal"
        autoFocus={autoFocus}
        className="h-12 pl-9 text-lg font-semibold tabular"
        placeholder="0"
        value={text}
        onFocus={(e) => {
          setFocused(true);
          setText(value ? String(value) : "");
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseAmount(e.target.value));
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseAmount(text);
          onChange(parsed);
          setText(parsed ? formatNumber(parsed, currency, locale) : "");
        }}
      />
    </div>
  );
}
