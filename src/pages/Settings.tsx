import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Palette,
  RotateCcw,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import type { AccentColor, RadiusPref, ThemeMode } from "@/types";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ProfilesManager } from "@/features/profiles/ProfilesManager";
import {
  useActions,
  useData,
  useProfile,
  useSettings,
} from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCIES } from "@/lib/format";
import {
  exportJSON,
  exportTransactionsCSV,
  parseImportedJSON,
  parseTransactionsCSV,
} from "@/lib/io";
import { readFileAsDataURL, readFileAsText, formatBytes } from "@/lib/utils";
import { storage } from "@/storage/storage";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACCENTS: { key: AccentColor; color: string }[] = [
  { key: "indigo", color: "#6366f1" },
  { key: "violet", color: "#8b5cf6" },
  { key: "blue", color: "#3b82f6" },
  { key: "emerald", color: "#10b981" },
  { key: "rose", color: "#f43f5e" },
  { key: "amber", color: "#f59e0b" },
  { key: "teal", color: "#14b8a6" },
];

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

const RADII: { key: RadiusPref; label: string }[] = [
  { key: "none", label: "Square" },
  { key: "sm", label: "Small" },
  { key: "md", label: "Medium" },
  { key: "lg", label: "Round" },
];

const LOCALES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "id-ID", label: "Bahasa Indonesia" },
  { code: "de-DE", label: "Deutsch" },
  { code: "fr-FR", label: "Français" },
  { code: "ja-JP", label: "日本語" },
  { code: "zh-CN", label: "中文" },
];

function timezones(): string[] {
  try {
    // @ts-expect-error supportedValuesOf may not be typed in older libs
    const list = Intl.supportedValuesOf?.("timeZone") as string[] | undefined;
    if (list?.length) return list;
  } catch {
    /* ignore */
  }
  return ["UTC", "Asia/Jakarta", "Asia/Singapore", "America/New_York", "Europe/London"];
}

export default function Settings() {
  const profile = useProfile();
  const settings = useSettings();
  const data = useData();
  const actions = useActions();
  const { toast } = useToast();

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState<unknown | null>(null);

  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") ?? "account");
  useEffect(() => {
    const t = params.get("tab");
    if (t) setTab(t);
  }, [params]);
  const changeTab = (v: string) => {
    setTab(v);
    setParams(v === "account" ? {} : { tab: v }, { replace: true });
  };

  const usage = useMemo(() => storage.getUsage(), [data]);
  const usagePct = Math.min((usage.bytes / usage.quota) * 100, 100);
  const lastSaved = storage.getLastSavedTime();
  const lastBackup = storage.getLastBackupTime();
  const tzList = useMemo(timezones, []);

  const { appearance } = settings;

  const onAvatar = async (file?: File) => {
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Keep it under 512KB." });
      return;
    }
    const dataUrl = await readFileAsDataURL(file);
    actions.updateProfile({ avatar: dataUrl });
  };

  const onImportJSON = async (file?: File) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = parseImportedJSON(text);
      setConfirmImport(parsed);
    } catch {
      toast({ variant: "destructive", title: "Invalid file", description: "That file isn't valid JSON." });
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  const doImport = () => {
    if (confirmImport == null) return;
    try {
      actions.importData(confirmImport);
      toast({ title: "Data imported", description: "Your backup was restored successfully." });
    } catch {
      toast({ variant: "destructive", title: "Import failed", description: "The data could not be imported." });
    }
    setConfirmImport(null);
  };

  const onImportCSV = async (file?: File) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const { imported, skipped } = parseTransactionsCSV(text, data);
      imported.forEach((t) => actions.addTransaction(t));
      toast({
        title: `Imported ${imported.length} transaction(s)`,
        description: skipped ? `${skipped} row(s) skipped (unknown wallet).` : undefined,
      });
    } catch {
      toast({ variant: "destructive", title: "Import failed", description: "Could not parse the CSV." });
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Personalize your workspace and manage your data." />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:h-10 sm:w-auto sm:gap-0">
          <TabsTrigger value="account">
            <User className="h-4 w-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="profiles">
            <Users className="h-4 w-4" /> Profiles
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="h-4 w-4" /> Data
          </TabsTrigger>
        </TabsList>

        {/* PROFILES (switchable datasets) */}
        <TabsContent value="profiles" className="space-y-4">
          <ProfilesManager />
        </TabsContent>

        {/* ACCOUNT (personal info for the active profile) */}
        <TabsContent value="account" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-semibold uppercase">
                  {profile.name.slice(0, 1)}
                </div>
              )}
              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                  <Upload /> Upload photo
                </Button>
                {profile.avatar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => actions.updateProfile({ avatar: undefined })}
                  >
                    Remove
                  </Button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatar(e.target.files?.[0])}
                />
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="pname" className="mb-1.5 block">
                  Name
                </Label>
                <Input
                  id="pname"
                  value={profile.name}
                  onChange={(e) => actions.updateProfile({ name: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Currency</Label>
                <Select
                  value={profile.currency}
                  onValueChange={(v) => actions.updateProfile({ currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Language / Format</Label>
                <Select
                  value={profile.locale}
                  onValueChange={(v) => actions.updateProfile({ locale: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">Timezone</Label>
                <Select
                  value={profile.timezone}
                  onValueChange={(v) => actions.updateProfile({ timezone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {tzList.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="space-y-5 p-5">
            <div>
              <Label className="mb-2 block">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => actions.updateAppearance({ theme: t.key })}
                    className={cn(
                      "rounded-lg border py-2.5 text-sm font-medium transition-colors",
                      appearance.theme === t.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Accent color</Label>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => actions.updateAppearance({ accent: a.key })}
                    aria-label={a.key}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                      appearance.accent === a.key && "ring-2 ring-foreground",
                    )}
                    style={{ backgroundColor: a.color }}
                  >
                    {appearance.accent === a.key && (
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Corner rounding</Label>
              <div className="grid grid-cols-4 gap-2">
                {RADII.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => actions.updateAppearance({ radius: r.key })}
                    className={cn(
                      "rounded-lg border py-2 text-sm transition-colors",
                      appearance.radius === r.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <label className="flex items-center justify-between">
              <span className="text-sm">
                <span className="font-medium">Compact mode</span>
                <span className="block text-xs text-muted-foreground">
                  Tighter spacing and smaller radius.
                </span>
              </span>
              <Switch
                checked={appearance.compact}
                onCheckedChange={(v) => actions.updateAppearance({ compact: v })}
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">
                <span className="font-medium">Animations</span>
                <span className="block text-xs text-muted-foreground">
                  Enable transitions and motion.
                </span>
              </span>
              <Switch
                checked={appearance.animations}
                onCheckedChange={(v) => actions.updateAppearance({ animations: v })}
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">
                <span className="font-medium">Privacy mode</span>
                <span className="block text-xs text-muted-foreground">
                  Hide all balances behind dots.
                </span>
              </span>
              <Switch
                checked={settings.preferences.privacyMode}
                onCheckedChange={(v) => actions.updatePreferences({ privacyMode: v })}
              />
            </label>
          </Card>
        </TabsContent>

        {/* DATA */}
        <TabsContent value="data" className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold">Storage</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatBytes(usage.bytes)} of ~{formatBytes(usage.quota)} used
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  usagePct > 90 ? "bg-destructive" : usagePct > 70 ? "bg-amber-500" : "bg-primary",
                )}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <p>Last saved: {lastSaved ? relativeTime(lastSaved) : "—"}</p>
              <p>Last backup: {lastBackup ? relativeTime(lastBackup) : "—"}</p>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold">Backup & export</h3>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Export a full JSON backup (everything) or your transactions as CSV.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => exportJSON(data)}>
                <FileJson /> Export JSON
              </Button>
              <Button variant="outline" onClick={() => exportTransactionsCSV(data)}>
                <FileSpreadsheet /> Export CSV
              </Button>
              <Button variant="outline" onClick={() => jsonInputRef.current?.click()}>
                <Upload /> Import JSON
              </Button>
              <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
                <Download /> Import CSV
              </Button>
            </div>
            <input
              ref={jsonInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onImportJSON(e.target.files?.[0])}
            />
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onImportCSV(e.target.files?.[0])}
            />
          </Card>

          <Card className="border-destructive/30 p-5">
            <h3 className="font-semibold text-destructive">Danger zone</h3>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              These actions are irreversible. Export a backup first.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setConfirmClear(true)}>
                <Trash2 /> Clear all data
              </Button>
              <Button variant="destructive" onClick={() => setConfirmReset(true)}>
                <RotateCcw /> Reset application
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description="This removes every wallet and transaction but keeps default categories. This cannot be undone."
        confirmText="Clear everything"
        destructive
        onConfirm={() => {
          actions.clearAllData();
          toast({ title: "All data cleared" });
          setConfirmClear(false);
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset application?"
        description="This wipes everything (including backups) and restores the app to its fresh, first-run state."
        confirmText="Reset app"
        destructive
        onConfirm={() => {
          actions.resetApp();
          toast({ title: "Application reset" });
          setConfirmReset(false);
        }}
      />

      <ConfirmDialog
        open={confirmImport != null}
        onOpenChange={(o) => !o && setConfirmImport(null)}
        title="Import this backup?"
        description="Importing replaces ALL current data with the contents of this file. Export a backup first if you're unsure."
        confirmText="Replace & import"
        destructive
        onConfirm={doImport}
      />
    </div>
  );
}
