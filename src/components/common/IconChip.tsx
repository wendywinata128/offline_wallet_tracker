import { getIcon } from "@/data/icons";
import { colorToken } from "@/data/palette";
import { cn } from "@/lib/utils";

interface IconChipProps {
  icon: string;
  color: string;
  /** visual size */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
};

/** A rounded, color-tinted icon badge used for wallets & categories. */
export function IconChip({ icon, color, size = "md", className }: IconChipProps) {
  const Icon = getIcon(icon);
  const token = colorToken(color);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: token.solid, color: "#fff" }}
    >
      <Icon strokeWidth={2.25} />
    </div>
  );
}
