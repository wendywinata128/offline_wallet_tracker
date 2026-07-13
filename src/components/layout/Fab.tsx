import { ArrowRightLeft, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUI } from "@/providers/UIProvider";

/** Mobile-only floating action button with quick-add options. */
export function Fab() {
  const { openTransaction, openWallet } = useUI();
  return (
    <div className="safe-bottom fixed bottom-16 right-4 z-30 lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="mb-2">
          <DropdownMenuItem onClick={() => openTransaction({ prefill: { type: "expense" } })}>
            <TrendingDown className="text-destructive" /> Add expense
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openTransaction({ prefill: { type: "income" } })}>
            <TrendingUp className="text-success" /> Add income
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openTransaction({ prefill: { type: "transfer" } })}>
            <ArrowRightLeft className="text-primary" /> Transfer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openWallet()}>
            <Wallet /> Add wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
