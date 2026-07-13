import { useMemo, useState } from "react";
import { AlertTriangle, MoreVertical, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Budget } from "@/types";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/EmptyState";
import { Money } from "@/components/common/Money";
import { IconChip } from "@/components/common/IconChip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BudgetForm } from "@/features/budgets/BudgetForm";
import { useActions, useCategoryMap, useData } from "@/store/hooks";
import { budgetSpend } from "@/store/selectors";
import { cn } from "@/lib/utils";

export default function Budgets() {
  const data = useData();
  const categories = useCategoryMap();
  const actions = useActions();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const rows = useMemo(
    () =>
      data.budgets.map((b) => {
        const spent = budgetSpend(data, b);
        const ratio = b.amount > 0 ? spent / b.amount : 0;
        return { budget: b, spent, ratio, remaining: b.amount - spent };
      }),
    [data],
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description={`Monthly limits · ${format(new Date(), "MMMM yyyy")}`}
        actions={
          <Button onClick={openNew}>
            <Plus /> Add budget
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No budgets set"
          description="Create a monthly budget to keep your spending on track and get alerts when you're close to the limit."
          action={
            <Button onClick={openNew}>
              <Plus /> Add budget
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map(({ budget, spent, ratio, remaining }) => {
            const cat = budget.categoryId ? categories.get(budget.categoryId) : null;
            const over = ratio > 1;
            const warning = ratio >= 0.85 && !over;
            const pct = Math.min(ratio * 100, 100);
            return (
              <Card key={budget.id} className="p-4">
                <div className="flex items-center gap-3">
                  {cat ? (
                    <IconChip icon={cat.icon} color={cat.color} />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Target className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {cat ? cat.name : "Overall spending"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Money amount={spent} /> of <Money amount={budget.amount} />
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label="Budget actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(budget);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => actions.deleteBudget(budget.id)}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Progress
                  value={pct}
                  className="mt-3"
                  indicatorClassName={cn(
                    over ? "bg-destructive" : warning ? "bg-amber-500" : "bg-success",
                  )}
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "font-medium",
                      over
                        ? "text-destructive"
                        : warning
                          ? "text-amber-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {over ? (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Over by{" "}
                        <Money amount={Math.abs(remaining)} />
                      </span>
                    ) : (
                      <>
                        <Money amount={remaining} /> left
                      </>
                    )}
                  </span>
                  <span className="text-muted-foreground">{Math.round(ratio * 100)}%</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
    </div>
  );
}
