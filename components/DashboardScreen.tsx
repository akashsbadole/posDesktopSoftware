"use client";
import { useEffect, useState, useMemo } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Package, RefreshCw } from "lucide-react";
import { useOrdersStore, useSettingsStore } from "@/lib/stores";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

type RangeType = "7" | "14" | "30";

export default function DashboardScreen() {
  const {
    dashboardData,
    weeklyRevenue,
    topProducts,
    lowStock,
    isLoading,
    fetchDashboardData,
  } = useOrdersStore();
  const { settings, fetchSettings } = useSettingsStore();
  const [range, setRange] = useState<RangeType>("7");

  useEffect(() => {
    fetchDashboardData();
    fetchSettings();
  }, []);

  const curr = settings?.currency ?? "₹";

  const stats = [
    { label: "Today's Revenue", value: `${curr}${dashboardData.revenue.toFixed(0)}`, icon: DollarSign, color: "#F5C842", bg: "rgba(245,200,66,0.08)" },
    { label: "Transactions", value: dashboardData.transactions, icon: ShoppingBag, color: "#3498DB", bg: "rgba(52,152,219,0.08)" },
    { label: "Avg Order", value: `${curr}${dashboardData.avg_order.toFixed(0)}`, icon: TrendingUp, color: "#2ECC71", bg: "rgba(46,204,113,0.08)" },
    { label: "Items Sold", value: dashboardData.items_sold, icon: Package, color: "#9B59B6", bg: "rgba(155,89,182,0.08)" },
  ];

  const revenueData = useMemo(() => {
    return weeklyRevenue.map((d) => ({
      ...d,
      revenue: Math.round(d.revenue),
      tooltipLabel: `${d.label}: ${curr}${d.revenue.toFixed(0)}`,
    }));
  }, [weeklyRevenue, curr]);

  const productsData = useMemo(() => {
    return topProducts.map((p) => ({
      ...p,
      shortName: p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name,
    }));
  }, [topProducts]);

  const maxRevenue = Math.max(...weeklyRevenue.map((d) => d.revenue), 1);
  const totalRevenue = weeklyRevenue.reduce((sum, d) => sum + d.revenue, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="rounded-lg px-3 py-2 text-xs shadow-xl border" style={{ background: "#1E1E26", borderColor: "#2A2A3A" }}>
        <p className="font-semibold mb-1">{label}</p>
        <p style={{ color: "#F5C842" }}>{`${curr}${payload[0].value.toFixed(0)}`}</p>
      </div>
    );
  };

  const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg px-3 py-2 text-xs shadow-xl border" style={{ background: "#1E1E26", borderColor: "#2A2A3A" }}>
        <p className="font-semibold mb-1">{d.name}</p>
        <p style={{ color: "#F5C842" }}>{`${curr}${d.revenue.toFixed(0)}`}</p>
        <p style={{ color: "#9090A8" }}>{`${d.qty} units`}</p>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold">Dashboard</h1>
        <button onClick={() => fetchDashboardData()} className="btn-ghost py-2 px-3"><RefreshCw size={14} className={isLoading ? "spin" : ""} /></button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4 fade-in cursor-default transition-all duration-200 hover:scale-[1.02]" style={{ borderTop: `2px solid ${s.color}33` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide" style={{ color: "#4A4A5A" }}>{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon size={16} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Revenue Trend</h2>
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "#1E1E26" }}>
              {(["7", "14", "30"] as RangeType[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: range === r ? "#F5C842" : "transparent",
                    color: range === r ? "#0D0D0F" : "#9090A8",
                  }}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>

          {revenueData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px]" style={{ color: "#4A4A5A" }}>
              No sales data yet
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-4 mb-3">
                <span className="text-2xl font-display font-bold" style={{ color: "#F5C842" }}>{curr}{totalRevenue.toFixed(0)}</span>
                <span className="text-xs" style={{ color: "#9090A8" }}>total this period</span>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5C842" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#F5C842" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E26" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#4A4A5A" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#4A4A5A" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${curr}${v}`} width={55} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#F5C84233", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#F5C842"
                      strokeWidth={2}
                      fill="url(#revenueGrad)"
                      activeDot={{ r: 5, fill: "#F5C842", stroke: "#0D0D0F", strokeWidth: 2 }}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-4 text-sm">Top Products</h2>
          {productsData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px]" style={{ color: "#4A4A5A" }}>
              No sales data yet
            </div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productsData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E26" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#4A4A5A" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${curr}${v}`} />
                  <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10, fill: "#9090A8" }} axisLine={false} tickLine={false} width={85} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "#1E1E26" }} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]} animationDuration={800}>
                    {productsData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#F5C842" : i === 1 ? "#3498DB" : "#2A2A3A"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 col-span-2">
        <h2 className="font-semibold mb-3 text-sm flex items-center gap-2">
          Low Stock Alerts
          {lowStock.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(231,76,60,0.15)", color: "#E74C3C" }}>
              {lowStock.length}
            </span>
          )}
        </h2>
        {lowStock.length === 0 && <div className="text-sm" style={{ color: "#2ECC71" }}>All products have sufficient stock</div>}
        <div className="grid grid-cols-4 gap-2">
          {lowStock.map((p) => (
            <div key={p.name} className="rounded-lg p-3 text-sm transition-all duration-200 hover:scale-[1.03] cursor-default"
              style={{
                background: p.stock === 0 ? "rgba(231,76,60,0.08)" : "rgba(245,200,66,0.06)",
                border: `1px solid ${p.stock === 0 ? "rgba(231,76,60,0.2)" : "rgba(245,200,66,0.15)"}`,
              }}>
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs mt-0.5 font-semibold" style={{ color: p.stock === 0 ? "#E74C3C" : "#F5C842" }}>
                {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
