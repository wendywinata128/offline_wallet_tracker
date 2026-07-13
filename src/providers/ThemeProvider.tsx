import { useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettings } from "@/store/hooks";

/**
 * Applies appearance settings to the document root as data-attributes/classes.
 * The CSS in index.css keys off these to switch theme, accent, radius, density
 * and to disable animations. Kept as a side-effect-only component.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { appearance } = useSettings();
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      appearance.theme === "dark" ||
      (appearance.theme === "system" && systemDark);

    root.classList.toggle("dark", isDark);
    root.dataset.accent = appearance.accent;
    root.dataset.radius = appearance.radius;
    root.dataset.animations = appearance.animations ? "on" : "off";
    root.dataset.density = appearance.compact ? "compact" : "comfortable";

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]:not([media])',
    );
    if (meta) meta.content = isDark ? "#0b0b0f" : "#ffffff";
  }, [appearance, systemDark]);

  return <>{children}</>;
}
