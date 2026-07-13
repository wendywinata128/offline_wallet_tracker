import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Money } from "@/components/common/Money";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartCard } from "@/features/analytics/ChartCard";
import { IconChip } from "@/components/common/IconChip";
import { useData, useProfile } from "@/store/hooks";
import {
  categoryBreakdown,
  cashFlowSeries,
  dailySeries,
  monthlySeries,
  walletDistribution,
} from "@/store/analytics";
import { colorToken, seriesColor } from "@/data/palette";
import { formatMoney } from "@/lib/format";

const RANGES = [3, 6, 12] as const;

function useAxisFormatter() {
  const profile = useProfile();
  return (v: number) => formatMoney(v, profile.currency, profile.locale, { compact: true });
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; payload?: unknown }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="capitalize text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-semibold">
            <Money amount={p.value} />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const data = useData();
  const axisFmt = useAxisFormatter();
  const [months, setMonths] = useState<(typeof RANGES)[number]>(6);
  const [flow, setFlow] = useState<"expense" | "income">("expense");

  const hasData = data.transactions.length > 0;

  const monthly = useMemo(() => monthlySeries(data, months), [data, months]);
  const cashFlow = useMemo(() => cashFlowSeries(data, months), [data, months]);
  const catSlices = useMemo(() => categoryBreakdown(data, flow, 0), [data, flow]);
  const walletDist = useMemo(() => walletDistribution(data), [data]);
  const daily = useMemo(() => dailySeries(data, 0), [data]);

  const gridColor = "hsl(var(--border))";

  if (!hasData) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Understand where your money flows." />
        <EmptyState
          icon={BarChart3}
          title="No data to analyze yet"
          description="Add a few transactions and your charts will come to life here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Understand where your money flows."
        actions={
          <Tabs value={String(months)} onValueChange={(v) => setMonths(Number(v) as never)}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r} value={String(r)}>
                  {r}M
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {/* Income vs Expense */}
      <ChartCard title="Income vs Expense" subtitle={`Last ${months} months`}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly} margin={{ left: -12, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickFormatter={axisFmt}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={64}
            />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
            <Bar dataKey="income" name="Income" fill={seriesColor(1)} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expense" fill={seriesColor(3)} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Cash flow cumulative */}
      <ChartCard title="Cash flow" subtitle="Cumulative net over time">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cashFlow} margin={{ left: -12, right: 8, top: 4 }}>
            <defs>
              <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={seriesColor(0)} stopOpacity={0.35} />
                <stop offset="95%" stopColor={seriesColor(0)} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickFormatter={axisFmt} tickLine={false} axisLine={false} fontSize={11} width={64} />
            <Tooltip content={<TooltipBox />} />
            <Area
              type="monotone"
              dataKey="net"
              name="Net"
              stroke={seriesColor(0)}
              strokeWidth={2}
              fill="url(#flowFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Category breakdown */}
        <ChartCard
          title="By category"
          subtitle="This month"
          action={
            <Tabs value={flow} onValueChange={(v) => setFlow(v as never)}>
              <TabsList className="h-8">
                <TabsTrigger value="expense" className="text-xs">
                  Expense
                </TabsTrigger>
                <TabsTrigger value="income" className="text-xs">
                  Income
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          {catSlices.length ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ResponsiveContainer width="100%" height={180} className="max-w-[180px]">
                <PieChart>
                  <Pie
                    data={catSlices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {catSlices.map((s) => (
                      <Cell key={s.categoryId ?? "none"} fill={colorToken(s.color).solid} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full flex-1 space-y-2">
                {catSlices.slice(0, 6).map((s) => (
                  <div key={s.categoryId ?? "none"} className="flex items-center gap-2 text-sm">
                    <IconChip icon={s.icon} color={s.color} size="sm" className="h-6 w-6 rounded-md" />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {s.percent.toFixed(0)}%
                    </span>
                    <Money amount={s.value} className="w-20 text-right text-xs font-medium" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No {flow} recorded this month.
            </p>
          )}
        </ChartCard>

        {/* Wallet distribution */}
        <ChartCard title="Wallet distribution" subtitle="Where your money sits">
          {walletDist.length ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ResponsiveContainer width="100%" height={180} className="max-w-[180px]">
                <PieChart>
                  <Pie
                    data={walletDist}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {walletDist.map((s) => (
                      <Cell key={s.walletId} fill={colorToken(s.color).solid} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full flex-1 space-y-2">
                {walletDist.slice(0, 6).map((s) => (
                  <div key={s.walletId} className="flex items-center gap-2 text-sm">
                    <IconChip icon={s.icon} color={s.color} size="sm" className="h-6 w-6 rounded-md" />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {s.percent.toFixed(0)}%
                    </span>
                    <Money amount={s.value} className="w-20 text-right text-xs font-medium" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No positive balances to show.
            </p>
          )}
        </ChartCard>
      </div>

      {/* Daily spending this month */}
      <ChartCard title="Daily spending" subtitle="This month">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={daily} margin={{ left: -12, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={2} />
            <YAxis tickFormatter={axisFmt} tickLine={false} axisLine={false} fontSize={11} width={64} />
            <Tooltip content={<TooltipBox />} />
            <Line
              type="monotone"
              dataKey="expense"
              name="Spent"
              stroke={seriesColor(3)}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top categories list */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Top spending categories" subtitle="This month" >
          <div className="space-y-3">
            {categoryBreakdown(data, "expense", 0)
              .slice(0, 5)
              .map((s, i) => (
                <div key={s.categoryId ?? "none"}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                      {s.name}
                    </span>
                    <Money amount={s.value} className="font-medium" />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.percent}%`,
                        backgroundColor: colorToken(s.color).solid,
                      }}
                    />
                  </div>
                </div>
              ))}
            {categoryBreakdown(data, "expense", 0).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No spending this month.
              </p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Top wallets" subtitle="By balance" >
          <div className="space-y-3">
            {walletDist.slice(0, 5).map((s, i) => (
              <div key={s.walletId} className="flex items-center gap-3">
                <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                <IconChip icon={s.icon} color={s.color} size="sm" />
                <span className="flex items-center gap-1.5 truncate text-sm">
                  {s.name}
                  {i === 0 && <TrendingUp className="h-3.5 w-3.5 text-success" />}
                </span>
                <Money amount={s.value} className="ml-auto text-sm font-medium" />
              </div>
            ))}
            {walletDist.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No wallet balances yet.
              </p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
