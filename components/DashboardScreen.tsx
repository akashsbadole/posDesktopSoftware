"use client";
import { useEffect } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Package, RefreshCw } from "lucide-react";
import { useOrdersStore, useSettingsStore } from "@/lib/stores";

export default function DashboardScreen() {
  const { 
    dashboardData, 
    weeklyRevenue, 
    topProducts, 
    lowStock, 
    isLoading, 
    fetchDashboardData 
  } = useOrdersStore();
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => { 
    fetchDashboardData();
    fetchSettings();
  }, []);

  const curr = settings?.currency_symbol ?? "₹";
  const maxRevenue = Math.max(...weeklyRevenue.map((d) => d.revenue), 1);

  const stats = [
    { label: "Today's Revenue", value: `${curr}${dashboardData.revenue.toFixed(0)}`, icon: DollarSign, color: "#F5C842" },
    { label: "Transactions", value: dashboardData.transactions, icon: ShoppingBag, color: "#3498DB" },
    { label: "Avg Order", value: `${curr}${dashboardData.avg_order.toFixed(0)}`, icon: TrendingUp, color: "#2ECC71" },
    { label: "Items Sold", value: dashboardData.items_sold, icon: Package, color: "#9B59B6" },
  ];

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
            <div key={s.label} className="card p-4 fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide" style={{ color: "#4A4A5A" }}>{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <Icon size={16} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-4 text-sm">Weekly Revenue</h2>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {weeklyRevenue.map((d) => {
              const pct = (d.revenue / maxRevenue) * 100;
              const isToday = d.label === new Date().toLocaleDateString("en", { weekday: "short" });
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md" title={`${curr}${d.revenue.toFixed(0)}`}
                    style={{ height: `${Math.max(4, pct)}%`, background: isToday ? "#F5C842" : "#1E1E26", minHeight: 4 }} />
                  <span style={{ fontSize: 10, color: isToday ? "#F5C842" : "#4A4A5A" }}>{d.label}</span>
                </div>
              );
            })}
          </div>
          {weeklyRevenue.every((d) => d.revenue === 0) && <div className="text-center text-xs mt-2" style={{ color: "#4A4A5A" }}>No sales data yet</div>}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-4 text-sm">Top Products</h2>
          {topProducts.length === 0 && <div className="text-sm" style={{ color: "#4A4A5A" }}>No sales data yet</div>}
          <div className="space-y-3">
            {topProducts.map((p, i) => {
              const pct = (p.revenue / (topProducts[0]?.revenue || 1)) * 100;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate mr-2">{p.name}</span>
                    <span style={{ color: "#F5C842" }}>{curr}{p.revenue.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1E1E26" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i === 0 ? "#F5C842" : "#2A2A3A" }} />
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#4A4A5A" }}>{p.qty} units</div>
                </div>
              );
            })}
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
          {lowStock.length === 0 && <div className="text-sm" style={{ color: "#2ECC71" }}>✓ All products have sufficient stock</div>}
          <div className="grid grid-cols-4 gap-2">
            {lowStock.map((p) => (
              <div key={p.name} className="rounded-lg p-3 text-sm"
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
    </div>
  );
}
