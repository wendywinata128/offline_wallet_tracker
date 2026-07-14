import { useState } from "react";
import { format } from "date-fns";
import { Check, MoreVertical, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import type { ProfileSummary } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useActions, useProfiles } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";

export function ProfilesManager() {
  const profiles = useProfiles();
  const actions = useActions();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameTarget, setRenameTarget] = useState<ProfileSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProfileSummary | null>(null);

  const create = () => {
    actions.createProfile(newName);
    toast({ title: "Profile created" });
    setNewName("");
    setCreateOpen(false);
  };

  const rename = () => {
    if (!renameTarget) return;
    actions.renameProfile(renameTarget.id, renameValue);
    setRenameTarget(null);
    toast({ title: "Profile renamed" });
  };

  const remove = () => {
    if (!deleteTarget) return;
    actions.deleteProfile(deleteTarget.id);
    setDeleteTarget(null);
    toast({ title: "Profile deleted" });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Profiles</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Each profile is a completely separate set of wallets and transactions.
              Switch between them like separate accounts — great for personal vs.
              business, or tracking someone else's money.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus /> New
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {profiles.map((p) => (
          <Card key={p.id} className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold uppercase text-primary">
              {p.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{p.name}</p>
                {p.active && (
                  <Badge variant="success">
                    <Check className="h-3 w-3" /> Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Created {format(new Date(p.createdAt), "MMM d, yyyy")}
              </p>
            </div>

            {!p.active && (
              <Button variant="outline" size="sm" onClick={() => actions.switchProfile(p.id)}>
                Switch
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={`${p.name} actions`}
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setRenameTarget(p);
                    setRenameValue(p.name);
                  }}
                >
                  <Pencil /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={profiles.length <= 1}
                  onClick={() => setDeleteTarget(p)}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        ))}
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New profile</DialogTitle>
            <DialogDescription>
              Starts fresh with a single Cash wallet. Your current profile stays untouched.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="np" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="np"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Business, Family, Savings"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create}>
              <UserPlus /> Create profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={renameTarget != null} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename profile</DialogTitle>
            <DialogDescription className="sr-only">Change the profile name.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && rename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={rename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "profile"}?`}
        description="This permanently deletes this profile and ALL of its wallets and transactions. This cannot be undone."
        confirmText="Delete profile"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
