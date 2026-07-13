/**
 * Named color tokens for wallets & categories. We store the KEY (stable), not
 * raw hex, so a future re-theme can remap. Each token carries the values used
 * for solid fills, soft backgrounds, and chart series.
 */
export interface ColorToken {
  key: string;
  name: string;
  /** solid color (icon chip background, chart bar) */
  solid: string;
  /** subtle tinted background */
  soft: string;
  /** foreground/text over soft bg */
  text: string;
}

export const COLORS: ColorToken[] = [
  { key: "indigo", name: "Indigo", solid: "#6366f1", soft: "#eef2ff", text: "#4338ca" },
  { key: "violet", name: "Violet", solid: "#8b5cf6", soft: "#f5f3ff", text: "#6d28d9" },
  { key: "blue", name: "Blue", solid: "#3b82f6", soft: "#eff6ff", text: "#1d4ed8" },
  { key: "sky", name: "Sky", solid: "#0ea5e9", soft: "#f0f9ff", text: "#0369a1" },
  { key: "cyan", name: "Cyan", solid: "#06b6d4", soft: "#ecfeff", text: "#0e7490" },
  { key: "teal", name: "Teal", solid: "#14b8a6", soft: "#f0fdfa", text: "#0f766e" },
  { key: "emerald", name: "Emerald", solid: "#10b981", soft: "#ecfdf5", text: "#047857" },
  { key: "green", name: "Green", solid: "#22c55e", soft: "#f0fdf4", text: "#15803d" },
  { key: "lime", name: "Lime", solid: "#84cc16", soft: "#f7fee7", text: "#4d7c0f" },
  { key: "amber", name: "Amber", solid: "#f59e0b", soft: "#fffbeb", text: "#b45309" },
  { key: "orange", name: "Orange", solid: "#f97316", soft: "#fff7ed", text: "#c2410c" },
  { key: "red", name: "Red", solid: "#ef4444", soft: "#fef2f2", text: "#b91c1c" },
  { key: "rose", name: "Rose", solid: "#f43f5e", soft: "#fff1f2", text: "#be123c" },
  { key: "pink", name: "Pink", solid: "#ec4899", soft: "#fdf2f8", text: "#be185d" },
  { key: "fuchsia", name: "Fuchsia", solid: "#d946ef", soft: "#fdf4ff", text: "#a21caf" },
  { key: "slate", name: "Slate", solid: "#64748b", soft: "#f8fafc", text: "#334155" },
];

const byKey = new Map(COLORS.map((c) => [c.key, c]));

export function colorToken(key: string): ColorToken {
  return byKey.get(key) ?? COLORS[0];
}

/** Ordered series colors for charts (avoids adjacent-hue collisions). */
export const CHART_SERIES = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#64748b",
  "#d946ef",
];

export function seriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}
