"use client";

import { useState, useEffect } from "react";
import { RefreshCw, AlertTriangle, X, Bell, Package } from "lucide-react";
import { dbGetInventoryAlerts, dbCheckInventoryAlerts, dbClearInventoryAlert, InventoryAlert } from "@/lib/db";

export default function InventoryAlertsScreen() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const data = await dbGetInventoryAlerts();
      setAlerts(data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleCheckAlerts = async () => {
    setChecking(true);
    try {
      const data = await dbCheckInventoryAlerts();
      setAlerts(data);
    } catch (err) {
      console.error("Failed to check alerts:", err);
    } finally {
      setChecking(false);
    }
  };

  const handleClearAlert = async (id: string) => {
    setClearing(id);
    try {
      await dbClearInventoryAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Failed to clear alert:", err);
    } finally {
      setClearing(null);
    }
  };

  const lowStock = alerts.filter(a => a.alert_type === "low_stock");
  const outOfStock = alerts.filter(a => a.alert_type === "out_of_stock");

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: "#4A4A5A" }}>
        <RefreshCw size={24} className="spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold font-display flex items-center gap-2">
          <Bell size={24} style={{ color: "#F5C842" }} />
          Inventory Alerts
        </h1>
        <div className="flex gap-2">
          <button onClick={fetchAlerts} className="btn-ghost py-2 px-3" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleCheckAlerts} disabled={checking} className="btn-accent py-2 px-4 flex items-center gap-2 text-sm">
            {checking ? <RefreshCw size={16} className="spin" /> : <><AlertTriangle size={16} /> Check Now</>}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4" style={{ borderLeft: "4px solid #E74C3C" }}>
          <div className="text-xs mb-1" style={{ color: "#9090A8" }}>Out of Stock</div>
          <div className="text-lg font-bold font-display" style={{ color: "#E74C3C" }}>{outOfStock.length}</div>
        </div>
        <div className="card p-4" style={{ borderLeft: "4px solid #F39C12" }}>
          <div className="text-xs mb-1" style={{ color: "#9090A8" }}>Low Stock</div>
          <div className="text-lg font-bold font-display" style={{ color: "#F39C12" }}>{lowStock.length}</div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: "#4A4A5A" }}>
          <Package size={48} className="mb-4 opacity-50" />
          <p>No inventory alerts</p>
          <p className="text-sm mt-1">All products are well stocked</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="card p-4 flex items-center justify-between"
              style={{
                borderLeft: `4px solid ${alert.alert_type === "out_of_stock" ? "#E74C3C" : "#F39C12"}`,
              }}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} style={{ color: alert.alert_type === "out_of_stock" ? "#E74C3C" : "#F39C12" }} />
                <div>
                  <div className="font-medium">{alert.product_name}</div>
                  <div className="text-xs" style={{ color: "#9090A8" }}>
                    Current stock: {alert.current_stock} • Threshold: {alert.threshold}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-medium" style={{
                  background: alert.alert_type === "out_of_stock" ? "rgba(231,76,60,0.15)" : "rgba(243,156,18,0.15)",
                  color: alert.alert_type === "out_of_stock" ? "#E74C3C" : "#F39C12",
                }}>
                  {alert.alert_type === "out_of_stock" ? "OUT OF STOCK" : "LOW STOCK"}
                </span>
                <button
                  onClick={() => handleClearAlert(alert.id)}
                  disabled={clearing === alert.id}
                  className="p-1 rounded hover:bg-red-500/10"
                  style={{ color: "#9090A8" }}
                  title="Dismiss alert"
                >
                  {clearing === alert.id ? <RefreshCw size={14} className="spin" /> : <X size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
