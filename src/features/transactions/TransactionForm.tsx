import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowRightLeft, Paperclip, TrendingDown, TrendingUp, X } from "lucide-react";
import type { Attachment, Transaction, TransactionType } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountInput } from "@/components/common/AmountInput";
import { TagInput } from "@/components/common/TagInput";
import { IconChip } from "@/components/common/IconChip";
import { useActions, useCategories, useData, useProfile, useWallets } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";
import { readFileAsDataURL } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toDate } from "@/lib/format";

export interface TransactionPrefill {
  type?: TransactionType;
  walletId?: string;
  toWalletId?: string;
  categoryId?: string;
  amount?: number;
  description?: string;
  tags?: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Transaction | null;
  prefill?: TransactionPrefill;
}

const TYPES: { value: TransactionType; label: string; icon: typeof TrendingUp }[] = [
  { value: "expense", label: "Expense", icon: TrendingDown },
  { value: "income", label: "Income", icon: TrendingUp },
  { value: "transfer", label: "Transfer", icon: ArrowRightLeft },
];

const MAX_ATTACHMENT_BYTES = 512 * 1024; // 512KB per file to protect quota

function splitDate(iso: string) {
  const d = toDate(iso);
  return { date: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm") };
}

function combineDate(date: string, time: string): string {
  const iso = new Date(`${date}T${time || "00:00"}`);
  return Number.isNaN(iso.getTime()) ? new Date().toISOString() : iso.toISOString();
}

export function TransactionForm({ open, onOpenChange, editing, prefill }: Props) {
  const wallets = useWallets();
  const categories = useCategories();
  const profile = useProfile();
  const data = useData();
  const actions = useActions();
  const { toast } = useToast();

  const activeWallets = useMemo(() => wallets.filter((w) => !w.archived), [wallets]);
  const defaultWalletId =
    data.settings.preferences.defaultWalletId ?? activeWallets[0]?.id ?? "";

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState(0);
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [dateStr, setDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeStr, setTimeStr] = useState(format(new Date(), "HH:mm"));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // (Re)initialize whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setType(editing.type);
      setAmount(editing.amount);
      setWalletId(editing.walletId);
      setToWalletId(editing.toWalletId ?? "");
      setCategoryId(editing.categoryId);
      setDescription(editing.description);
      setNotes(editing.notes ?? "");
      setTags(editing.tags);
      const s = splitDate(editing.date);
      setDateStr(s.date);
      setTimeStr(s.time);
      setAttachments(editing.attachments ?? []);
    } else {
      setType(prefill?.type ?? "expense");
      setAmount(prefill?.amount ?? 0);
      setWalletId(prefill?.walletId ?? defaultWalletId);
      setToWalletId(prefill?.toWalletId ?? "");
      setCategoryId(prefill?.categoryId);
      setDescription(prefill?.description ?? "");
      setNotes("");
      setTags(prefill?.tags ?? []);
      const now = new Date();
      setDateStr(format(now, "yyyy-MM-dd"));
      setTimeStr(format(now, "HH:mm"));
      setAttachments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const relevantCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.kind === "both" || c.kind === (type === "income" ? "income" : "expense"),
      ),
    [categories, type],
  );

  const tagSuggestions = useMemo(() => {
    const seen = new Set<string>();
    for (const t of data.transactions) for (const tag of t.tags) seen.add(tag);
    return [...seen].slice(0, 12);
  }, [data.transactions]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `"${file.name}" exceeds 512KB and was skipped.`,
        });
        continue;
      }
      try {
        const dataUrl = await readFileAsDataURL(file);
        next.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          dataUrl,
          size: file.size,
        });
      } catch {
        /* ignore unreadable file */
      }
    }
    setAttachments((prev) => [...prev, ...next]);
  };

  const submit = () => {
    if (amount <= 0) return setError("Enter an amount greater than zero.");
    if (!walletId) return setError("Choose a wallet.");
    if (type === "transfer") {
      if (!toWalletId) return setError("Choose a destination wallet.");
      if (toWalletId === walletId)
        return setError("Source and destination must differ.");
    }

    const payload = {
      type,
      amount,
      walletId,
      toWalletId: type === "transfer" ? toWalletId : undefined,
      categoryId: type === "transfer" ? undefined : categoryId,
      description:
        description.trim() ||
        (type === "transfer" ? "Transfer" : type === "income" ? "Income" : "Expense"),
      notes: notes.trim() || undefined,
      tags,
      date: combineDate(dateStr, timeStr),
      attachments: attachments.length ? attachments : undefined,
    };

    if (editing) {
      actions.updateTransaction(editing.id, payload);
      toast({ title: "Transaction updated" });
    } else {
      actions.addTransaction(payload);
      toast({ title: "Transaction added" });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "New transaction"}</DialogTitle>
          <DialogDescription className="sr-only">
            Record income, an expense, or a transfer between wallets.
          </DialogDescription>
        </DialogHeader>

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const selected = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border py-2.5 text-sm font-medium transition-all",
                  selected
                    ? t.value === "income"
                      ? "border-success bg-success/10 text-success"
                      : t.value === "expense"
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount" className="mb-1.5 block">
              Amount
            </Label>
            <AmountInput
              id="amount"
              value={amount}
              onChange={setAmount}
              currency={profile.currency}
              locale={profile.locale}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">
                {type === "transfer" ? "From" : "Wallet"}
              </Label>
              <Select value={walletId} onValueChange={setWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {activeWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2">
                        <IconChip icon={w.icon} color={w.color} size="sm" className="h-5 w-5 rounded-md" />
                        {w.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "transfer" ? (
              <div>
                <Label className="mb-1.5 block">To</Label>
                <Select value={toWalletId} onValueChange={setToWalletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWallets
                      .filter((w) => w.id !== walletId)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          <span className="flex items-center gap-2">
                            <IconChip icon={w.icon} color={w.color} size="sm" className="h-5 w-5 rounded-md" />
                            {w.name}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="mb-1.5 block">Category</Label>
                <Select
                  value={categoryId ?? "none"}
                  onValueChange={(v) => setCategoryId(v === "none" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {relevantCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <IconChip icon={c.icon} color={c.color} size="sm" className="h-5 w-5 rounded-md" />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="desc" className="mb-1.5 block">
              Description
            </Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch at the cafe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="mb-1.5 block">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time" className="mb-1.5 block">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags…"
              suggestions={tagSuggestions}
            />
          </div>

          <div>
            <Label htmlFor="notes" className="mb-1.5 block">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label>Attachments</Label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Paperclip className="h-3.5 w-3.5" />
                Attach
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="group relative overflow-hidden rounded-md border"
                  >
                    {a.type.startsWith("image/") ? (
                      <img
                        src={a.dataUrl}
                        alt={a.name}
                        className="h-16 w-16 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center bg-muted text-[10px] text-muted-foreground">
                        {a.name.slice(0, 10)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((x) => x.id !== a.id))
                      }
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{editing ? "Save changes" : "Add transaction"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
