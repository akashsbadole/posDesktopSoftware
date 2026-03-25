"use client";

import { useState, useEffect } from "react";
import { Check, X, Clock, RefreshCw, ChefHat, ArrowLeft, Utensils } from "lucide-react";
import { KdsOrder, getKdsOrders, markKdsItemDone, openKdsWindow } from "@/lib/db";

export default function KDSScreen() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await getKdsOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch KDS orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleItemDone = async (orderId: string, itemIndex: number) => {
    setProcessing(`${orderId}-${itemIndex}`);
    try {
      await markKdsItemDone(orderId, itemIndex);
      await fetchOrders();
    } catch (err) {
      console.error("Failed to mark item done:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleOrderDone = async (orderId: string) => {
    setProcessing(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        for (let i = 0; i < order.items.length; i++) {
          if (!order.items[i].done) {
            await markKdsItemDone(orderId, i);
          }
        }
      }
      await fetchOrders();
    } catch (err) {
      console.error("Failed to complete order:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleOpenKdsWindow = async () => {
    try {
      await openKdsWindow();
    } catch (err) {
      console.error("Failed to open KDS window:", err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const getTimeSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const pendingOrders = orders.filter(o => o.items.some(i => !i.done));
  const completedOrders = orders.filter(o => o.items.every(i => i.done));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: "#4A4A5A" }}>
        <RefreshCw size={24} className="spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col" style={{ background: "#0D0D0F" }}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenKdsWindow}
            className="btn-ghost py-2 px-3 flex items-center gap-2"
            title="Open in separate window"
          >
            <Utensils size={18} />
            Pop Out
          </button>
          <h1 className="font-display text-xl font-bold flex items-center gap-2">
            <ChefHat size={24} style={{ color: "#F5C842" }} />
            Kitchen Display
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchOrders} 
            className="btn-ghost py-2 px-3"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: "rgba(231,76,60,0.15)", color: "#E74C3C" }}>
              {pendingOrders.length} Pending
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: "rgba(46,204,113,0.15)", color: "#2ECC71" }}>
              {completedOrders.length} Done
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: "#4A4A5A" }}>
            <ChefHat size={64} className="mb-4 opacity-50" />
            <p className="text-lg">No orders in kitchen</p>
            <p className="text-sm">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const allDone = order.items.every(i => i.done);
              const pendingItems = order.items.filter(i => !i.done).length;
              
              return (
                <div 
                  key={order.id}
                  className={`card p-4 transition-all ${allDone ? "opacity-60" : ""}`}
                  style={{ 
                    borderLeft: allDone ? "4px solid #2ECC71" : pendingItems > 2 ? "4px solid #E74C3C" : "4px solid #F5C842"
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-lg" style={{ color: allDone ? "#2ECC71" : "#F5C842" }}>
                        {order.order_type.toUpperCase()}
                      </div>
                      <div className="text-xs" style={{ color: "#4A4A5A" }}>
                        {order.customer_name || "Walk-in"} • {formatTime(order.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: "#4A4A5A" }}>
                        <Clock size={12} className="inline mr-1" />
                        {getTimeSince(order.created_at)}
                      </div>
                      <div className="text-xs" style={{ color: allDone ? "#2ECC71" : pendingItems > 2 ? "#E74C3C" : "#F5C842" }}>
                        {pendingItems} pending
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg ${item.done ? "line-through" : ""}`}
                        style={{ 
                          background: item.done ? "rgba(46,204,113,0.1)" : "rgba(245,200,66,0.05)",
                          textDecoration: item.done ? "line-through" : "none"
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold" style={{ color: item.done ? "#2ECC71" : "#F5C842" }}>
                            {item.quantity}x
                          </span>
                          <span style={{ color: item.done ? "#2ECC71" : "#E8E8F0" }}>
                            {item.product_name}
                          </span>
                        </div>
                        {!item.done && (
                          <button
                            onClick={() => handleItemDone(order.id, idx)}
                            disabled={processing === `${order.id}-${idx}`}
                            className="p-1.5 rounded-lg"
                            style={{ 
                              background: "rgba(46,204,113,0.15)", 
                              color: "#2ECC71" 
                            }}
                            title="Mark done"
                          >
                            {processing === `${order.id}-${idx}` ? (
                              <RefreshCw size={14} className="spin" />
                            ) : (
                              <Check size={14} />
                            )}
                          </button>
                        )}
                        {item.done && (
                          <Check size={14} style={{ color: "#2ECC71" }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {!allDone && (
                    <button
                      onClick={() => handleOrderDone(order.id)}
                      disabled={processing === order.id}
                      className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                      style={{ 
                        background: "rgba(46,204,113,0.15)", 
                        color: "#2ECC71" 
                      }}
                    >
                      {processing === order.id ? (
                        <RefreshCw size={14} className="spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Complete Order
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
