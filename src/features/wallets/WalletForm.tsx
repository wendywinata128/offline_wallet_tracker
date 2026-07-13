import { useEffect, useState } from "react";
import type { Wallet, WalletType } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconChip } from "@/components/common/IconChip";
import { IconPicker } from "@/components/common/IconPicker";
import { ColorPicker } from "@/components/common/ColorPicker";
import { AmountInput } from "@/components/common/AmountInput";
import { WALLET_ICON_KEYS } from "@/data/icons";
import { CURRENCIES } from "@/lib/format";
import { useActions, useProfile } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Wallet | null;
}

const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank account" },
  { value: "ewallet", label: "E-wallet" },
  { value: "credit", label: "Credit card" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

export function WalletForm({ open, onOpenChange, editing }: Props) {
  const profile = useProfile();
  const actions = useActions();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("bank");
  const [icon, setIcon] = useState("wallet");
  const [color, setColor] = useState("indigo");
  const [currency, setCurrency] = useState(profile.currency);
  const [initialBalance, setInitialBalance] = useState(0);
  const [excludeFromTotal, setExcludeFromTotal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setIcon(editing.icon);
      setColor(editing.color);
      setCurrency(editing.currency);
      setInitialBalance(editing.initialBalance);
      setExcludeFromTotal(editing.excludeFromTotal);
    } else {
      setName("");
      setType("bank");
      setIcon("wallet");
      setColor("indigo");
      setCurrency(profile.currency);
      setInitialBalance(0);
      setExcludeFromTotal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    if (!name.trim()) return setError("Give your wallet a name.");
    const payload = {
      name: name.trim(),
      type,
      icon,
      color,
      currency,
      initialBalance,
      excludeFromTotal,
    };
    if (editing) {
      actions.updateWallet(editing.id, payload);
      toast({ title: "Wallet updated" });
    } else {
      actions.addWallet(payload);
      toast({ title: "Wallet added" });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit wallet" : "New wallet"}</DialogTitle>
          <DialogDescription className="sr-only">
            Configure a place where you keep money.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <IconChip icon={icon} color={color} size="lg" />
          <div className="flex-1">
            <Label htmlFor="wname" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="wname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BCA, GoPay, Cash"
              autoFocus
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as WalletType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WALLET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">
            {editing ? "Opening balance" : "Starting balance"}
          </Label>
          <AmountInput
            value={initialBalance}
            onChange={setInitialBalance}
            currency={currency}
            locale={profile.locale}
          />
        </div>

        <div>
          <Label className="mb-2 block">Color</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div>
          <Label className="mb-2 block">Icon</Label>
          <IconPicker value={icon} onChange={setIcon} icons={WALLET_ICON_KEYS} color={color} />
        </div>

        <label className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm">
            <span className="font-medium">Exclude from totals</span>
            <span className="block text-xs text-muted-foreground">
              Keep this wallet out of net worth & total assets.
            </span>
          </span>
          <Switch checked={excludeFromTotal} onCheckedChange={setExcludeFromTotal} />
        </label>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{editing ? "Save changes" : "Add wallet"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
