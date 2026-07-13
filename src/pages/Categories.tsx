import { useMemo, useState } from "react";
import { MoreVertical, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import type { Category } from "@/types";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/common/IconChip";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryForm } from "@/features/categories/CategoryForm";
import { useActions, useCategories, useData } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";

export default function Categories() {
  const categories = useCategories();
  const data = useData();
  const actions = useActions();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.categoryId) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [data.transactions]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const count = usage.get(pendingDelete.id) ?? 0;
    actions.deleteCategory(pendingDelete.id);
    toast({
      title: "Category deleted",
      description: count
        ? `${count} transaction(s) are now uncategorized.`
        : undefined,
    });
    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize transactions into meaningful groups."
        actions={
          <Button onClick={openNew}>
            <Plus /> Add category
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories"
          description="Add categories to classify your spending and income."
          action={
            <Button onClick={openNew}>
              <Plus /> Add category
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="flex items-center gap-3 p-3">
              <IconChip icon={c.icon} color={c.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Badge
                    variant={
                      c.kind === "income"
                        ? "success"
                        : c.kind === "expense"
                          ? "destructive"
                          : "muted"
                    }
                    className="capitalize"
                  >
                    {c.kind}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {usage.get(c.id) ?? 0} used
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`${c.name} actions`}
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(c)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setPendingDelete(c)}
                  >
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
        </div>
      )}

      <CategoryForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name ?? "category"}?`}
        description="Transactions using this category will become uncategorized. This cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
