import { Eye, EyeOff, Plus, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActions, useSettings } from "@/store/hooks";
import { useUI } from "@/providers/UIProvider";

export function Topbar() {
  const { preferences } = useSettings();
  const actions = useActions();
  const { openSearch, openTransaction } = useUI();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/80 px-4 glass sm:px-6 lg:pl-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="h-[18px] w-[18px]" />
        </div>
        <span className="font-bold">Wallet Tracker</span>
      </div>

      <button
        onClick={openSearch}
        className="ml-auto flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted lg:ml-0 lg:w-72"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search transactions…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5 lg:ml-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => actions.togglePrivacy()}
              aria-label={preferences.privacyMode ? "Show balances" : "Hide balances"}
            >
              {preferences.privacyMode ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {preferences.privacyMode ? "Show balances" : "Hide balances"}
          </TooltipContent>
        </Tooltip>

        <Button className="hidden sm:inline-flex" onClick={() => openTransaction()}>
          <Plus /> New
        </Button>
      </div>
    </header>
  );
}
