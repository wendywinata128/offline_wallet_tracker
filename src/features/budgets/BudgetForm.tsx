import { useEffect, useMemo, useState } from "react";
import type { Budget } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountInput } from "@/components/common/AmountInput";
import { useActions, useCategories, useData, useProfile } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Budget | null;
}

const GLOBAL = "__global__";

export function BudgetForm({ open, onOpenChange, editing }: Props) {
  const categories = useCategories();
  const profile = useProfile();
  const data = useData();
  const actions = useActions();
  const { toast } = useToast();

  const [categoryId, setCategoryId] = useState<string>(GLOBAL);
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind !== "income"),
    [categories],
  );

  const usedCategoryIds = useMemo(
    () =>
      new Set(
        data.budgets
          .filter((b) => b.id !== editing?.id)
          .map((b) => b.categoryId ?? GLOBAL),
      ),
    [data.budgets, editing],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setCategoryId(editing.categoryId ?? GLOBAL);
      setAmount(editing.amount);
    } else {
      setCategoryId(usedCategoryIds.has(GLOBAL) ? "" : GLOBAL);
      setAmount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    if (amount <= 0) return setError("Set a budget amount.");
    if (!categoryId) return setError("Choose what this budget covers.");
    actions.upsertBudget(categoryId === GLOBAL ? null : categoryId, amount);
    toast({ title: editing ? "Budget updated" : "Budget created" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit budget" : "New monthly budget"}</DialogTitle>
          <DialogDescription>
            Set a monthly spending limit and track your progress.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label className="mb-1.5 block">Applies to</Label>
          <Select value={categoryId} onValueChange={setCategoryId} disabled={!!editing}>
            <SelectTrigger>
              <SelectValue placeholder="Choose category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL} disabled={usedCategoryIds.has(GLOBAL)}>
                All expenses (overall)
              </SelectItem>
              {expenseCategories.map((c) => (
                <SelectItem key={c.id} value={c.id} disabled={usedCategoryIds.has(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block">Monthly limit</Label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            currency={profile.currency}
            locale={profile.locale}
          />
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{editing ? "Save" : "Create budget"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
