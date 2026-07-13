import { useEffect, useState } from "react";
import type { Category } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconChip } from "@/components/common/IconChip";
import { IconPicker } from "@/components/common/IconPicker";
import { ColorPicker } from "@/components/common/ColorPicker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_ICON_KEYS } from "@/data/icons";
import { useActions } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Category | null;
}

export function CategoryForm({ open, onOpenChange, editing }: Props) {
  const actions = useActions();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<Category["kind"]>("expense");
  const [icon, setIcon] = useState("more");
  const [color, setColor] = useState("indigo");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setKind(editing.kind);
      setIcon(editing.icon);
      setColor(editing.color);
    } else {
      setName("");
      setKind("expense");
      setIcon("more");
      setColor("indigo");
    }
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) return setError("Give the category a name.");
    if (editing) {
      actions.updateCategory(editing.id, { name: name.trim(), kind, icon, color });
      toast({ title: "Category updated" });
    } else {
      actions.addCategory({ name: name.trim(), kind, icon, color });
      toast({ title: "Category added" });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription className="sr-only">
            Categories help you group and analyze transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <IconChip icon={icon} color={color} size="lg" />
          <div className="flex-1">
            <Label htmlFor="cname" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries"
              autoFocus
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Applies to</Label>
          <Tabs value={kind} onValueChange={(v) => setKind(v as Category["kind"])}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">
                Expense
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1">
                Income
              </TabsTrigger>
              <TabsTrigger value="both" className="flex-1">
                Both
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div>
          <Label className="mb-2 block">Color</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div>
          <Label className="mb-2 block">Icon</Label>
          <IconPicker value={icon} onChange={setIcon} icons={CATEGORY_ICON_KEYS} color={color} />
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{editing ? "Save changes" : "Add category"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
