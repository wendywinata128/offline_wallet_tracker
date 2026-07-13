# 💳 Wallet Tracker

A premium, **offline-first** personal finance tracker. Know exactly where all your
money is stored and where every expense goes — no backend, no database, no account.
Everything lives in your browser's LocalStorage and works fully offline.

Built with **React · TypeScript · Vite · TailwindCSS · shadcn/ui · Lucide · React Router · Recharts**.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to /dist
npm run preview  # preview the production build
```

Deploys to **Vercel** with zero configuration (see [Deployment](#deployment)).

---

## ✨ Features

- **Dashboard** — every wallet at a glance, with net worth, total assets, monthly
  in/out, today's spend and wallet count. Search, sort, drag-to-reorder, pin & favorite.
- **Wallets** — Cash, banks (BCA, SeaBank…), e-wallets (GoPay, OVO, Dana…), credit
  cards, savings, investments. Custom icon, color, currency, opening balance.
- **Transactions** — income, expense, and **transfers** (which update both wallets
  automatically). Description, category, tags, notes, date/time, and Base64 attachments.
  Running balance, day-grouping, search, filter, sort, pagination, duplicate, **undo delete**.
- **Categories** — 13 sensible defaults + unlimited custom categories with icon, color, and scope.
- **Analytics** — income vs expense, cumulative cash flow, by-category donuts,
  wallet distribution, daily spending, top categories, top wallets.
- **Budgets** — monthly limits per category or overall, with progress bars and over-budget alerts.
- **Global search** (`⌘K`) — across description, amount, tags, category, wallet, notes, date.
- **Settings** — profile (name, avatar, currency, language, timezone), appearance
  (light/dark/system, 7 accent colors, corner rounding, compact mode, animations),
  and data (JSON export/import, CSV export/import, storage usage, backup timestamps,
  clear data, reset app).
- **Privacy mode** — hide all balances behind dots (`b` to toggle).
- **Recurring transactions** — rules that materialize automatically when due.
- **Keyboard shortcuts**, **mobile FAB**, **toasts**, **confirmation dialogs**,
  **empty states**, **loading skeletons**, and full **light/dark theming**.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `⌘K` / `Ctrl+K` / `/` | Global search |
| `n` | New transaction |
| `b` | Toggle balance privacy |

---

## 🏗 Architecture

### Data flow

```
localStorage ──► StorageService ──► Store (observable) ──► useSyncExternalStore ──► React
      ▲                │                    │
      └── debounced ───┘          pure selectors (derived state)
          save                    computeWallet / computeTotals / analytics
```

- **`StorageService`** is the *only* code that touches `localStorage`. It owns
  versioning, migrations, defensive validation, corruption quarantine + recovery,
  automatic backup-before-write, quota handling, and usage accounting.
- **`Store`** is a tiny dependency-free observable holding the single `AppData` tree.
  It does immutable updates and exposes typed action methods. React binds to it via
  `useSyncExternalStore`, so only components reading changed slices re-render.
- **Selectors** are pure functions. **Balances are never stored** — they are always
  *derived* from the transaction ledger, so a wallet balance can never drift out of
  sync with its transactions. Transfers are a single record affecting two wallets.
- **`UIProvider`** centralizes global modals (transaction, wallet, search) and exposes
  imperative openers (`useUI().openTransaction(...)`) so any component can trigger them.

### Folder structure

```
src/
├── main.tsx                 # entry + ErrorBoundary
├── App.tsx                  # router + providers
├── index.css                # design tokens, themes, accent presets
│
├── types/                   # all domain types (single source of truth)
├── data/
│   ├── defaults.ts          # seed data, versions, factories
│   ├── icons.tsx            # stable icon registry (key → Lucide component)
│   └── palette.ts           # named color tokens + chart series
│
├── storage/                 # THE localStorage boundary
│   ├── storage.ts           # StorageService (versioning, backup, recovery, quota)
│   ├── validate.ts          # defensive normalization of untrusted data
│   └── migrations.ts        # version migration chain
│
├── store/
│   ├── store.ts             # observable store + all actions
│   ├── selectors.ts         # derived balances & totals (pure)
│   ├── analytics.ts         # chart aggregations (pure)
│   ├── recurring.ts         # recurring-rule materialization (pure)
│   └── hooks.ts             # React bindings (useData, useWallets, …)
│
├── lib/                     # framework-agnostic utilities
│   ├── utils.ts  format.ts  io.ts     # cn/uid, money/date, JSON+CSV import/export
│
├── hooks/                   # use-media-query, use-debounce, use-global-shortcuts
├── providers/               # ThemeProvider, UIProvider
├── config/                  # nav config
│
├── components/
│   ├── ui/                  # shadcn/ui primitives (Radix-based)
│   ├── common/              # Money, IconChip, StatCard, pickers, EmptyState, …
│   └── layout/              # AppShell, Sidebar, Topbar, MobileNav, Fab, ErrorBoundary
│
├── features/                # feature-scoped components
│   ├── wallets/  transactions/  categories/  budgets/  analytics/  search/
│
└── pages/                   # route components (lazy-loaded)
    └── Dashboard · WalletDetail · Transactions · Analytics · Budgets · Categories · Settings · NotFound
```

### LocalStorage strategy

Data is stored under a single key `wallet-tracker:v1` as an envelope
`{ version, savedAt, data }`, with a rolling backup at `wallet-tracker:backup`.

- **On load:** parse → run migrations (`meta.version` → current) → normalize/validate.
- **On corruption:** the bad blob is moved to `wallet-tracker:corrupt`, the last good
  backup is restored, and the user is notified via a toast.
- **On write:** the previous good value is copied to the backup slot first, then the
  new value is written (debounced 200ms, flushed on `beforeunload`).
- **On quota exceeded:** the backup slot is dropped and the write is retried; the user
  is warned to export and trim attachments.

### Data model (export shape)

A full JSON export is a versioned, self-describing envelope, safe to import into
future versions:

```jsonc
{
  "kind": "wallet-tracker-backup",
  "version": 1,
  "exportedAt": "2026-07-13T...",
  "data": {
    "wallets": [...], "transactions": [...], "categories": [...],
    "budgets": [...], "templates": [...], "recurring": [...],
    "settings": {...}, "profile": {...},
    "meta": { "version": 1, "createdAt": "...", "lastModified": "...", "appVersion": "1.0.0" }
  }
}
```

---

## 🚀 Deployment

### Vercel (recommended)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel: **New Project → Import**. Framework preset auto-detects **Vite**.
   - Build command: `npm run build`
   - Output directory: `dist`
3. Deploy. `vercel.json` already includes the SPA rewrite so client-side routes
   (`/wallets/:id`, `/settings`, …) resolve correctly on refresh/deep-link.

Or via CLI:

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

Because there is no backend, the app is a fully static bundle and works on any static
host (Netlify, Cloudflare Pages, GitHub Pages) — just add an SPA fallback to `index.html`.

---

## 🔮 Future improvements

- Multi-currency net worth with live FX conversion.
- IndexedDB backend for larger attachment storage beyond the ~5MB LocalStorage cap.
- PWA / installable offline app with a service worker and background recurring runs.
- Cloud sync (optional, end-to-end encrypted) across devices.
- Savings goals, debt payoff planners, and forecasting.
- Bank statement (OFX/QIF) import and smart auto-categorization.
- Split transactions and shared/household wallets.
- Virtualized transaction list for tens of thousands of records.
- Localized number/date formatting driven fully by the selected locale.

---

Built to be used every day. Your data is yours — it never leaves your browser.
