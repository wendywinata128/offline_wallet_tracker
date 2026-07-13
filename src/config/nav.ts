import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Tags,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** show in the mobile bottom bar */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, mobile: true },
  { to: "/analytics", label: "Analytics", icon: PieChart, mobile: true },
  { to: "/budgets", label: "Budgets", icon: Target, mobile: false },
  { to: "/categories", label: "Categories", icon: Tags, mobile: false },
  { to: "/settings", label: "Settings", icon: Settings, mobile: true },
];
