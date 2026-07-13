import { useNavigate } from "react-router-dom";
import {
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { WalletComputed } from "@/types";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/common/IconChip";
import { Money } from "@/components/common/Money";
import { colorToken } from "@/data/palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActions } from "@/store/hooks";
import { useUI } from "@/providers/UIProvider";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  data: WalletComputed;
  onDelete: (id: string) => void;
}

export function WalletCard({ data, onDelete }: Props) {
  const { wallet, balance, totalIncome, totalExpense, lastTransaction } = data;
  const navigate = useNavigate();
  const actions = useActions();
  const { openWallet } = useUI();

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden p-4 transition-all hover:shadow-md hover:-translate-y-0.5",
        wallet.excludeFromTotal && "opacity-90",
      )}
      onClick={() => navigate(`/wallets/${wallet.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(`/wallets/${wallet.id}`);
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: colorToken(wallet.color).solid }}
      />
      <div className="flex items-start justify-between">
        <IconChip icon={wallet.icon} color={wallet.color} size="lg" />
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {wallet.favorite && (
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          )}
          {wallet.pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={`${wallet.name} actions`}
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openWallet(wallet)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.updateWallet(wallet.id, { pinned: !wallet.pinned })}
              >
                {wallet.pinned ? <PinOff /> : <Pin />}
                {wallet.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  actions.updateWallet(wallet.id, { favorite: !wallet.favorite })
                }
              >
                <Star /> {wallet.favorite ? "Unfavorite" : "Favorite"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(wallet.id)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3">
        <p className="truncate font-semibold">{wallet.name}</p>
        <Money
          amount={balance}
          className="mt-0.5 block text-xl font-bold tracking-tight"
          colored={balance < 0}
        />
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-success">
          <TrendingUp className="h-3.5 w-3.5" />
          <Money amount={totalIncome} compact />
        </span>
        <span className="flex items-center gap-1 text-destructive">
          <TrendingDown className="h-3.5 w-3.5" />
          <Money amount={totalExpense} compact />
        </span>
      </div>

      <p className="mt-2 truncate text-[11px] text-muted-foreground">
        {lastTransaction
          ? `Last: ${lastTransaction.description || "transaction"} · ${relativeTime(lastTransaction.date)}`
          : "No transactions yet"}
      </p>
    </Card>
  );
}
