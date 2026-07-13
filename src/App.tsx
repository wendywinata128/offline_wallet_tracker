import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { UIProvider } from "@/providers/UIProvider";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

// Route-level code splitting for the heavier pages (charts especially).
const WalletDetail = lazy(() => import("@/pages/WalletDetail"));
const Transactions = lazy(() => import("@/pages/Transactions"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Budgets = lazy(() => import("@/pages/Budgets"));
const Categories = lazy(() => import("@/pages/Categories"));
const Settings = lazy(() => import("@/pages/Settings"));

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/wallets/:id", element: <WalletDetail /> },
      { path: "/transactions", element: <Transactions /> },
      { path: "/analytics", element: <Analytics /> },
      { path: "/budgets", element: <Budgets /> },
      { path: "/categories", element: <Categories /> },
      { path: "/settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <UIProvider>
          <RouterProvider router={router} />
          <Toaster />
        </UIProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
