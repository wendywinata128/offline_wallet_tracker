import { NavLink } from "react-router-dom";
import { Wallet } from "lucide-react";
import { NAV_ITEMS } from "@/config/nav";
import { useProfile } from "@/store/hooks";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const profile = useProfile();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card/50 lg:flex">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">Wallet Tracker</p>
          <p className="text-xs text-muted-foreground">Personal finance</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
        >
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold uppercase">
              {profile.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="text-xs text-muted-foreground">{profile.currency}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
