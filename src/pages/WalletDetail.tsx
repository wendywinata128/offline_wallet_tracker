import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/common/IconChip";
import { Money } from "@/components/common/Money";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ToastAction } from "@/components/ui/toast";
import { TransactionList } from "@/features/transactions/TransactionList";
import { useActions, useWallet } from "@/store/hooks";
import { useUI } from "@/providers/UIProvider";
import { useToast } from "@/components/ui/use-toast";
import { withRunningBalance } from "@/store/selectors";
import { WalletMinimal } from "lucide-react";

export default function WalletDetail() {
  const { id } = useParams<{ id: string }>();
  const result = useWallet(id);
  const navigate = useNavigate();
  const actions = useActions();
  const { openWallet, openTransaction } = useUI();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTotals, setShowTotals] = useState(false);

  const runningBalances = useMemo(() => {
    if (!result) return undefined;
    const map = new Map<string, number>();
    for (const { txn, running } of withRunningBalance(result.wallet, result.transactions)) {
      map.set(txn.id, running);
    }
    return map;
  }, [result]);

  if (!result) {
    return (
      <EmptyState
        icon={WalletMinimal}
        title="Wallet not found"
        description="This wallet may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft /> Back to dashboard
            </Link>
          </Button>
        }
      />
    );
  }

  const { wallet, computed } = result;

  const handleDelete = () => {
    const removed = actions.deleteWallet(wallet.id);
    setConfirmDelete(false);
    navigate("/");
    if (!removed) return;
    toast({
      title: "Wallet deleted",
      description: `"${removed.wallet.name}" removed.`,
      action: (
        <ToastAction
          altText="Undo"
          onClick={() => actions.restoreWallet(removed.wallet, removed.transactions)}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft /> Back
      </Button>

      {/* Wallet header */}
      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5">
          <div className="flex min-w-0 items-center gap-4">
            <IconChip icon={wallet.icon} color={wallet.color} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{wallet.name}</h1>
                <Badge variant="muted" className="capitalize">
                  {wallet.type}
                </Badge>
                {wallet.excludeFromTotal && (
                  <Badge variant="outline">Excluded</Badge>
                )}
              </div>
              <Money
                amount={computed.balance}
                colored={computed.balance < 0}
                className="mt-1 block text-3xl font-bold tracking-tight"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              className="hidden sm:inline-flex"
              onClick={() => openTransaction({ prefill: { walletId: wallet.id } })}
            >
              <Plus /> Transaction
            </Button>
            <Button variant="outline" size="icon" onClick={() => openWallet(wallet)} aria-label="Edit wallet">
              <Pencil className="h-[18px] w-[18px]" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete wallet"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </div>

        {/* Collapsible totals */}
        <button
          type="button"
          onClick={() => setShowTotals((v) => !v)}
          aria-expanded={showTotals}
          className="flex w-full items-center justify-between border-t px-5 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
        >
          <span>Totals</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", showTotals && "rotate-180")}
          />
        </button>
        {showTotals && (
          <div className="grid grid-cols-2 divide-x border-t animate-slide-up">
            <div className="p-4">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-success" /> Total in
              </p>
              <Money amount={computed.totalIncome} className="mt-1 block font-semibold" />
            </div>
            <div className="p-4">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" /> Total out
              </p>
              <Money amount={computed.totalExpense} className="mt-1 block font-semibold" />
            </div>
          </div>
        )}
      </Card>

      <TransactionList
        transactions={result.transactions}
        runningBalances={runningBalances}
        emptyAction={
          <Button onClick={() => openTransaction({ prefill: { walletId: wallet.id } })}>
            <Plus /> Add transaction
          </Button>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${wallet.name}?`}
        description="This permanently removes the wallet and all of its transactions. You can undo right after."
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
