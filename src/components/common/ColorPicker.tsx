import { Check } from "lucide-react";
import { COLORS } from "@/data/palette";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => {
        const selected = c.key === value;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            aria-label={c.name}
            aria-pressed={selected}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
              selected && "ring-2 ring-foreground",
            )}
            style={{ backgroundColor: c.solid }}
          >
            {selected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
