import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "@/config/nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const items = NAV_ITEMS.filter((i) => i.mobile);
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 glass lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
