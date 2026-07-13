import { getIcon } from "@/data/icons";
import { colorToken } from "@/data/palette";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  icons: string[];
  color: string;
}

export function IconPicker({ value, onChange, icons, color }: IconPickerProps) {
  const token = colorToken(color);
  return (
    <div className="grid grid-cols-7 gap-2 sm:grid-cols-9">
      {icons.map((key) => {
        const Icon = getIcon(key);
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            aria-pressed={selected}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border transition-all hover:scale-105",
              selected
                ? "border-transparent text-white shadow-sm"
                : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
            )}
            style={selected ? { backgroundColor: token.solid } : undefined}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}
    </div>
  );
}
