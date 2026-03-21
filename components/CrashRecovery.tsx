"use client";
import { useState, useEffect } from "react";
import { dbGetPendingOrders, dbDeletePendingOrder, Order } from "@/lib/db";
import { AlertTriangle, Trash2, RefreshCw, X } from "lucide-react";

interface CrashRecoveryProps {
  onComplete: () => void;
}

export default function CrashRecovery({ onComplete }: CrashRecoveryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    setLoading(true);
    try {
      const data = await dbGetPendingOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load pending orders:", err);
    }
    setLoading(false);
  };

  const handleDiscardOrder = async (id: string) => {
    if (!confirm("Are you sure you want to discard this order?")) return;
    try {
      await dbDeletePendingOrder(id);
      await loadPendingOrders();
    } catch (err) {
      console.error("Failed to discard order:", err);
    }
  };

  const handleDismiss = () => {
    onComplete();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.9)" }}>
        <div className="card p-8 text-center">
          <RefreshCw size={32} className="spin mx-auto mb-4" style={{ color: "#F5C842" }} />
          <p>Checking for pending orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    onComplete();
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.9)" }}>
      <div className="card p-6 w-[500px] max-h-[80vh] overflow-y-auto fade-in" role="alertdialog" aria-labelledby="recovery-title">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={28} style={{ color: "#F5C842" }} />
          <div>
            <h2 id="recovery-title" className="font-display text-lg" style={{ color: "#F5C842" }}>
              Pending Orders Found
            </h2>
            <p className="text-sm" style={{ color: "#9090A8" }}>
              The app was closed with {orders.length} pending order{orders.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {orders.map((order, idx) => (
            <div key={order.id} className="p-4 rounded-lg" style={{ background: "#1E1E26" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Order #{idx + 1}</span>
                <span className="text-xs px-2 py-1 rounded" style={{ 
                  background: order.status === "hold" ? "rgba(245,200,66,0.2)" : "rgba(231,76,60,0.2)",
                  color: order.status === "hold" ? "#F5C842" : "#E74C3C"
                }}>
                  {order.status.toUpperCase()}
                </span>
              </div>
              <div className="text-sm mb-2" style={{ color: "#9090A8" }}>
                {order.items.length} items • ₹{order.total.toFixed(2)}
              </div>
              <div className="text-xs mb-3" style={{ color: "#4A4A5A" }}>
                {new Date(order.created_at).toLocaleString()}
              </div>
              <button
                onClick={() => handleDiscardOrder(order.id)}
                className="text-xs flex items-center gap-1 px-3 py-1.5 rounded"
                style={{ background: "rgba(231,76,60,0.2)", color: "#E74C3C" }}
              >
                <Trash2 size={12} /> Discard
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="btn-accent flex-1 py-3"
          >
            Restore Orders
          </button>
          <button
            onClick={handleDismiss}
            className="btn-ghost py-3 px-4"
          >
            Dismiss
          </button>
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "#4A4A5A" }}>
          Click "Restore Orders" to continue with these pending orders, or "Discard" to remove them.
        </p>
      </div>
    </div>
  );
}
