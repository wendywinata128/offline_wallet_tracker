import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActions, useProfile, useProfiles } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";

/**
 * Switch between saved profiles (independent datasets) — like separate
 * accounts. Lives in the sidebar footer on desktop.
 */
export function ProfileSwitcher() {
  const profiles = useProfiles();
  const profile = useProfile();
  const actions = useActions();
  const navigate = useNavigate();
  const { toast } = useToast();

  const active = profiles.find((p) => p.active) ?? profiles[0];

  const createProfile = () => {
    actions.createProfile();
    toast({ title: "Profile created", description: "You're now on a fresh, empty profile." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {profile.avatar ? (
          <img src={profile.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
            {(active?.name ?? "P").slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{active?.name ?? "Profile"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {profiles.length} profile{profiles.length === 1 ? "" : "s"}
          </p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[220px]">
        <DropdownMenuLabel>Profiles</DropdownMenuLabel>
        {profiles.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => actions.switchProfile(p.id)}>
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-semibold uppercase">
              {p.name.slice(0, 1)}
            </span>
            <span className="truncate">{p.name}</span>
            {p.active && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={createProfile}>
          <Plus /> New profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings?tab=profiles")}>
          <Settings2 /> Manage profiles
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
