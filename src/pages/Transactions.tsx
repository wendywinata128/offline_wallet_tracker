import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { TransactionList } from "@/features/transactions/TransactionList";
import { useData } from "@/store/hooks";
import { useUI } from "@/providers/UIProvider";

export default function Transactions() {
  const data = useData();
  const { openTransaction } = useUI();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description={`${data.transactions.length} record${data.transactions.length === 1 ? "" : "s"} across all wallets.`}
        actions={
          <Button onClick={() => openTransaction()}>
            <Plus /> New
          </Button>
        }
      />
      <TransactionList
        transactions={data.transactions}
        showWallet
        emptyAction={
          <Button onClick={() => openTransaction()}>
            <Plus /> Add transaction
          </Button>
        }
      />
    </div>
  );
}
