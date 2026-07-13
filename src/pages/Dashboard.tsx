import { useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  CalendarDays,
  Plus,
  Wallet as WalletIcon,
  PiggyBank,
} from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Money } from "@/components/common/Money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WalletCard } from "@/features/wallets/WalletCard";
import { TransactionItem } from "@/features/transactions/TransactionItem";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ToastAction } from "@/components/ui/toast";
import {
  useActions,
  useComputedWallets,
  useData,
  useTotals,
} from "@/store/hooks";
import { useUI } from "@/providers/UIProvider";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const computed = useComputedWallets();
  const totals = useTotals();
  const data = useData();
  const actions = useActions();
  const { openWallet, openTransaction } = useUI();
  const { toast } = useToast();

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);

  const visible = useMemo(
    () =>
      computed
        .filter((c) => !c.wallet.archived)
        .sort(
          (a, b) =>
            Number(b.wallet.pinned) - Number(a.wallet.pinned) ||
            a.wallet.order - b.wallet.order,
        ),
    [computed],
  );

  const recent = useMemo(
    () =>
      [...data.transactions]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 6),
    [data.transactions],
  );

  const canReorder = true;

  const handleDrop = (targetIndex: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === targetIndex) return;
    const ids = visible.map((c) => c.wallet.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(targetIndex, 0, moved);
    actions.reorderWallets(ids);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const removed = actions.deleteWallet(pendingDelete);
    setPendingDelete(null);
    if (!removed) return;
    toast({
      title: "Wallet deleted",
      description: `"${removed.wallet.name}" and ${removed.transactions.length} transaction(s) removed.`,
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

  const pendingWallet = computed.find((c) => c.wallet.id === pendingDelete)?.wallet;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <StatCard
          label="Total"
          value={<Money amount={totals.netWorth} colored={totals.netWorth < 0} />}
          icon={PiggyBank}
          hint={`${totals.walletCount} wallet${totals.walletCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="This month out"
          value={<Money amount={totals.monthSpending} />}
          icon={ArrowDownRight}
          accent="destructive"
          hint={
            <>
              Today: <Money amount={totals.todaySpending} className="text-xs" />
            </>
          }
        />
      </div>

      {/* Wallets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Wallets</h2>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => openWallet()}
          >
            <Plus /> Add wallet
          </Button>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No wallets yet"
            description="Add your first wallet — cash, a bank account, or an e-wallet."
            action={
              <Button onClick={() => openWallet()}>
                <Plus /> Add wallet
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {visible.map((c, i) => (
              <div
                key={c.wallet.id}
                draggable={canReorder}
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => canReorder && e.preventDefault()}
                onDrop={() => handleDrop(i)}
                className={canReorder ? "cursor-grab active:cursor-grabbing" : ""}
              >
                <WalletCard data={c} onDelete={setPendingDelete} />
              </div>
            ))}
          </div>
        )}
        {canReorder && visible.length > 1 && (
          <p className="text-xs text-muted-foreground">Tip: drag wallet cards to reorder.</p>
        )}
      </section>

      {/* Recent activity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <Button variant="ghost" size="sm" onClick={() => openTransaction()}>
            <Plus /> New
          </Button>
        </div>
        <Card className="p-2">
          {recent.length ? (
            recent.map((txn) => <TransactionItem key={txn.id} txn={txn} showWallet />)
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No activity yet"
              description="Add a transaction to start tracking your money."
              className="border-0 bg-transparent"
              action={
                <Button onClick={() => openTransaction()}>
                  <Plus /> Add transaction
                </Button>
              }
            />
          )}
        </Card>
      </section>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete ${pendingWallet?.name ?? "wallet"}?`}
        description="This permanently removes the wallet and all of its transactions. You can undo right after."
        confirmText="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
