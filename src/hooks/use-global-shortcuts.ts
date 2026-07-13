import { useEffect } from "react";
import { useActions } from "@/store/hooks";
import { useUI } from "@/providers/UIProvider";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * App-wide keyboard shortcuts:
 *   ⌘K / Ctrl+K / "/"  → search
 *   n                  → new transaction
 *   b                  → toggle balance privacy
 */
export function useGlobalShortcuts() {
  const { openSearch, openTransaction } = useUI();
  const actions = useActions();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }
      if (isTypingTarget(e.target)) return;

      if (e.key === "/") {
        e.preventDefault();
        openSearch();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openTransaction();
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        actions.togglePrivacy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, openTransaction, actions]);
}
