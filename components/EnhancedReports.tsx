"use client";
import { useState, useEffect } from "react";
import { dbGetHourlySales, dbGetStaffPerformance, dbGetSalesByItem, HourlySales, StaffPerformance, SalesByItem } from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";
import { X, BarChart2, Clock, Users, Package } from "lucide-react";

interface EnhancedReportsProps {
  onClose: () => void;
}

type TabType = "hourly" | "staff" | "items";

export default function EnhancedReports({ onClose }: EnhancedReportsProps) {
  const { settings, activeStoreId } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<TabType>("hourly");
  const [hourlyData, setHourlyData] = useState<HourlySales[]>([]);
  const [staffData, setStaffData] = useState<StaffPerformance[]>([]);
  const [itemsData, setItemsData] = useState<SalesByItem[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  const curr = settings?.currency_symbol ?? "₹";

  useEffect(() => {
    loadData();
  }, [activeStoreId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hourly, staff, items] = await Promise.all([
        dbGetHourlySales(today, activeStoreId),
        dbGetStaffPerformance(today, today, activeStoreId),
        dbGetSalesByItem(today, today, activeStoreId),
      ]);
      setHourlyData(hourly);
      setStaffData(staff);
      setItemsData(items);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
    setLoading(false);
  };

  const maxHourlyRevenue = Math.max(...hourlyData.map(h => h.revenue), 1);
  const maxItemRevenue = Math.max(...itemsData.map(i => i.revenue), 1);

  const tabs = [
    { id: "hourly" as TabType, label: "Hourly Sales", icon: Clock },
    { id: "staff" as TabType, label: "Staff Performance", icon: Users },
    { id: "items" as TabType, label: "Sales by Item", icon: Package },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="card p-6 w-[700px] max-h-[85vh] overflow-y-auto fade-in" role="dialog" aria-modal="true" aria-labelledby="reports-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="reports-title" className="font-display text-base" style={{ color: "#F5C842" }}>Enhanced Reports</h2>
          <button onClick={onClose} className="btn-ghost py-1 px-3" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="flex gap-2 mb-4" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? "bg-yellow-400 text-black" : "bg-[#1E1E26] text-gray-400"
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8" style={{ color: "#4A4A5A" }}>Loading...</div>
        ) : (
          <div role="tabpanel">
            {activeTab === "hourly" && (
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: "#9090A8" }}>Sales by Hour - {today}</h3>
                <div className="space-y-2">
                  {hourlyData.filter(h => h.revenue > 0 || h.orders > 0).length === 0 ? (
                    <div className="text-center py-8" style={{ color: "#4A4A5A" }}>No sales today yet</div>
                  ) : (
                    hourlyData.filter(h => h.revenue > 0 || h.orders > 0).map(h => (
                      <div key={h.hour} className="flex items-center gap-3">
                        <span className="text-xs w-12" style={{ color: "#4A4A5A" }}>
                          {h.hour.toString().padStart(2, "0")}:00
                        </span>
                        <div className="flex-1 h-6 bg-[#1E1E26] rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${(h.revenue / maxHourlyRevenue) * 100}%`,
                              background: "linear-gradient(90deg, #F5C842, #E8BB3A)",
                            }}
                          />
                        </div>
                        <span className="text-xs w-20 text-right" style={{ color: "#9090A8" }}>
                          {curr}{h.revenue.toFixed(0)} ({h.orders})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "staff" && (
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: "#9090A8" }}>Staff Performance - {today}</h3>
                {staffData.length === 0 ? (
                  <div className="text-center py-8" style={{ color: "#4A4A5A" }}>No staff activity today</div>
                ) : (
                  <div className="space-y-3">
                    {staffData.map(s => (
                      <div key={s.user_id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#1E1E26" }}>
                        <div>
                          <div className="font-medium">{s.user_name}</div>
                          <div className="text-xs" style={{ color: "#4A4A5A" }}>{s.total_orders} orders</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold" style={{ color: "#F5C842" }}>{curr}{s.total_revenue.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "items" && (
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: "#9090A8" }}>Sales by Item - {today}</h3>
                {itemsData.length === 0 ? (
                  <div className="text-center py-8" style={{ color: "#4A4A5A" }}>No items sold today</div>
                ) : (
                  <div className="space-y-2">
                    {itemsData.map(item => (
                      <div key={item.product_id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{item.product_name}</span>
                            <span className="text-xs" style={{ color: "#4A4A5A" }}>×{item.quantity}</span>
                          </div>
                          <div className="h-2 bg-[#1E1E26] rounded overflow-hidden mt-1">
                            <div
                              className="h-full rounded"
                              style={{
                                width: `${(item.revenue / maxItemRevenue) * 100}%`,
                                background: "#2ECC71",
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium w-20 text-right" style={{ color: "#2ECC71" }}>
                          {curr}{item.revenue.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
