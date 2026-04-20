"use client";
import { useEffect } from "react";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  RefreshCw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useOrdersStore, useSettingsStore, useStoresStore } from "@/lib/stores";
import SyncControls from "@/components/SyncControls";

export default function DashboardScreen() {
  const { activeStoreId } = useSettingsStore();
  const { stores } = useStoresStore();
  const {
    dashboardData,
    weeklyRevenue,
    topProducts,
    lowStock,
    paymentMethodStats,
    isLoading,
    error,
    fetchDashboardData,
  } = useOrdersStore();
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchDashboardData();
    fetchSettings();
  }, [activeStoreId]);

  const curr = settings?.currency_symbol ?? "₹";
  const revenueData = weeklyRevenue || [];
  const topProductsData = topProducts || [];
  const lowStockData = lowStock || [];
  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue), 1);

  const stats = [
    {
      label: "Today's Revenue",
      value: `${curr}${(dashboardData?.revenue || 0).toFixed(0)}`,
      icon: DollarSign,
      color: "#F5C842",
    },
    {
      label: "Transactions",
      value: dashboardData?.transactions || 0,
      icon: ShoppingBag,
      color: "#3498DB",
    },
    {
      label: "Avg Order",
      value: `${curr}${(dashboardData?.avg_order || 0).toFixed(0)}`,
      icon: TrendingUp,
      color: "#2ECC71",
    },
    {
      label: "Items Sold",
      value: dashboardData?.items_sold || 0,
      icon: Package,
      color: "#9B59B6",
    },
  ];

  const activeStore = stores.find((s) => s.id === activeStoreId);

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold font-display">
          Dashboard - {activeStore?.name || "Main Store"}
        </h1>
        <div className="flex items-center gap-3">
          <SyncControls />
          <span className="text-xs px-2 py-1 rounded bg-[#1E1E26] text-[#9090A8]">
            Store ID: {activeStoreId}
          </span>
          <button
            onClick={() => fetchDashboardData()}
            className="btn-ghost py-2 px-3"
          >
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Failed to load dashboard data: {error}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="underline font-medium hover:text-red-400 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4 fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-xs uppercase tracking-wide"
                  style={{ color: "#4A4A5A" }}
                >
                  {s.label}
                </h3>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}18` }}
                  aria-hidden="true"
                >
                  <Icon size={16} style={{ color: s.color }} />
                </div>
              </div>
              <div
                className="text-xl font-display font-bold"
                style={{ color: s.color }}
                aria-live="polite"
              >
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-4 text-sm">Weekly Revenue</h2>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E26" />
                <XAxis dataKey="label" stroke="#4A4A5A" fontSize={10} />
                <YAxis stroke="#4A4A5A" fontSize={10} />
                <Tooltip
                  contentStyle={{ background: "#141418", border: "1px solid #1E1E26", borderRadius: 4 }}
                  labelStyle={{ color: "#F5C842" }}
                  itemStyle={{ color: "#9090A8" }}
                  formatter={(value) => [`${curr}${Number(value).toFixed(0)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#F5C842" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-xs mt-2" style={{ color: "#4A4A5A" }}>
              No sales data yet
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-4 text-sm">Payment Methods</h2>
          {paymentMethodStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={paymentMethodStats}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={40}
                  fill="#8884d8"
                  label={({ method, percent }) => `${method} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {paymentMethodStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#F5C842", "#3498DB", "#E74C3C", "#2ECC71", "#9B59B6"][index % 5]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#141418", border: "1px solid #1E1E26", borderRadius: 4 }}
                  formatter={(value) => [`${curr}${Number(value).toFixed(0)}`, "Amount"]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-xs mt-2" style={{ color: "#4A4A5A" }}>
              No payment data yet
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-4 text-sm">Top Products</h2>
          {topProductsData.length === 0 && (
            <div className="text-sm" style={{ color: "#4A4A5A" }}>
              No sales data yet
            </div>
          )}
          <div className="space-y-3">
            {topProductsData.map((p, i) => {
              const pct =
                (p.revenue / (topProductsData[0]?.revenue || 1)) * 100;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate mr-2">{p.name}</span>
                    <span style={{ color: "#F5C842" }}>
                      {curr}
                      {p.revenue.toFixed(0)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "#1E1E26" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? "#F5C842" : "#2A2A3A",
                      }}
                    />
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#4A4A5A" }}>
                    {p.qty} units
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4 col-span-2">
          <h2 className="font-semibold mb-3 text-sm flex items-center gap-2">
            Low Stock Alerts
            {lowStockData.length > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(231,76,60,0.15)", color: "#E74C3C" }}
              >
                {lowStockData.length}
              </span>
            )}
          </h2>
          {lowStockData.length === 0 && (
            <div className="text-sm" style={{ color: "#2ECC71" }}>
              ✓ All products have sufficient stock
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {lowStockData.map((p) => (
              <div
                key={p.name}
                className="rounded-lg p-3 text-sm"
                style={{
                  background:
                    p.stock === 0
                      ? "rgba(231,76,60,0.08)"
                      : "rgba(245,200,66,0.06)",
                  border: `1px solid ${p.stock === 0 ? "rgba(231,76,60,0.2)" : "rgba(245,200,66,0.15)"}`,
                }}
              >
                <div className="font-medium truncate">{p.name}</div>
                <div
                  className="text-xs mt-0.5 font-semibold"
                  style={{ color: p.stock === 0 ? "#E74C3C" : "#F5C842" }}
                >
                  {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
