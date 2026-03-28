"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, Clock, RefreshCw, ChefHat, ArrowLeft, Utensils, Play, Ban, Flame, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { KdsOrder, getKdsOrders, markKdsItemDone, openKdsWindow, startPreparingItem, cancelKdsItem, recallKdsOrder } from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";

const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.type = 'square';
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
};

const getOrderTypeColor = (type: string) => {
  switch (type) {
    case 'dine_in': return '#4CAF50'; // green
    case 'takeaway': return '#FF9800'; // orange
    case 'delivery': return '#2196F3'; // blue
    default: return '#9E9E9E'; // grey
  }
};

export default function KDSScreen() {
  const { activeStoreId } = useSettingsStore();
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [previousOrders, setPreviousOrders] = useState<KdsOrder[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "preparing" | "done">("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const hasLoadedInitially = useRef(false);

  const fetchOrders = async () => {
    try {
      const data = await getKdsOrders(activeStoreId);
      if (hasLoadedInitially.current) {
        const newOrders = data.filter(order => !previousOrders.some(prev => prev.id === order.id));
        if (newOrders.length > 0 && soundEnabled) {
          playNotificationSound();
        }
      }
      setOrders(data);
      setPreviousOrders(data);
      hasLoadedInitially.current = true;
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
  }, [activeStoreId]);

  const handleStartPreparing = async (orderId: string, itemIndex: number) => {
    setProcessing(`${orderId}-${itemIndex}-prepare`);
    try {
      await startPreparingItem(orderId, itemIndex, activeStoreId);
      await fetchOrders();
    } catch (err) {
      console.error("Failed to start preparing:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleItemDone = async (orderId: string, itemIndex: number) => {
    setProcessing(`${orderId}-${itemIndex}`);
    try {
      await markKdsItemDone(orderId, itemIndex, activeStoreId);
      await fetchOrders();
    } catch (err) {
      console.error("Failed to mark item done:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleCancelItem = async (orderId: string, itemIndex: number) => {
    if (!confirm("Cancel this item? This cannot be undone.")) return;
    setProcessing(`${orderId}-${itemIndex}-cancel`);
    try {
      await cancelKdsItem(orderId, itemIndex, activeStoreId);
      await fetchOrders();
    } catch (err) {
      console.error("Failed to cancel item:", err);
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
            await markKdsItemDone(orderId, i, activeStoreId);
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

  const handleRecallOrder = async (orderId: string) => {
    if (!confirm("Recall this order back to pending?")) return;
    setProcessing(orderId + "-recall");
    try {
      await recallKdsOrder(orderId, activeStoreId);
      await fetchOrders();
    } catch (err) {
      console.error("Failed to recall order:", err);
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

  const pendingOrders = orders.filter(o => o.items.some(i => i.status !== "done" && i.status !== "cancelled"));
  const preparingOrders = orders.filter(o => o.items.some(i => i.status === "preparing"));
  const completedOrders = orders.filter(o => o.items.every(i => i.status === "done" || i.status === "cancelled"));

  const filteredOrders = filter === "all" 
    ? orders 
    : filter === "pending" 
      ? pendingOrders 
      : filter === "preparing"
        ? preparingOrders
        : completedOrders;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: "#4A4A5A" }}>
        <RefreshCw size={24} className="spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col" style={{ background: "#0D0D0F" }}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleOpenKdsWindow}
              className="btn-ghost py-2 px-3 flex items-center gap-2"
              title="Open in separate window"
            >
              <Utensils size={18} />
              Pop Out
            </button>
            <h1 className="font-display text-xl font-bold font-display flex items-center gap-2">
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
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="btn-ghost py-2 px-3"
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842" }}>
                {pendingOrders.length} Pending
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: "rgba(52,152,219,0.15)", color: "#3498DB" }}>
                {preparingOrders.length} Preparing
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: "rgba(46,204,113,0.15)", color: "#2ECC71" }}>
                {completedOrders.length} Done
              </span>
            </div>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#1E1E26", width: "fit-content" }}>
          {(["all", "pending", "preparing", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: filter === f ? "rgba(245,200,66,0.15)" : "transparent",
                color: filter === f ? "#F5C842" : "#9090A8",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "all" && ` (${f === "pending" ? pendingOrders.length : f === "preparing" ? preparingOrders.length : completedOrders.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: "#4A4A5A" }}>
            <ChefHat size={64} className="mb-4 opacity-50" />
            <p className="text-base">No orders in kitchen</p>
            <p className="text-sm">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const allDone = order.items.every(i => i.status === "done" || i.status === "cancelled");
              const pendingItems = order.items.filter(i => i.status !== "done" && i.status !== "cancelled").length;
              const preparingItems = order.items.filter(i => i.status === "preparing").length;
              
              return (
                <div 
                  key={order.id}
                  className={`card p-4 transition-all ${allDone ? "opacity-60" : ""}`}
                  style={{ 
                    borderLeft: allDone ? "4px solid #2ECC71" : preparingItems > 0 ? "4px solid #3498DB" : pendingItems > 2 ? "4px solid #E74C3C" : "4px solid #F5C842"
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-base" style={{ color: getOrderTypeColor(order.order_type) }}>
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
                      <div className="text-xs" style={{ color: allDone ? "#2ECC71" : preparingItems > 0 ? "#3498DB" : pendingItems > 2 ? "#E74C3C" : "#F5C842" }}>
                        {pendingItems > 0 ? `${pendingItems} pending` : preparingItems > 0 ? `${preparingItems} preparing` : "Ready"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => {
                      const itemStatus = item.status || "pending";
                      const isPending = itemStatus === "pending";
                      const isPreparing = itemStatus === "preparing";
                      const isDone = itemStatus === "done";
                      const isCancelled = itemStatus === "cancelled";
                      
                      return (
                        <div 
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded-lg ${isDone || isCancelled ? "line-through opacity-60" : ""}`}
                          style={{ 
                            background: isDone ? "rgba(46,204,113,0.1)" : isCancelled ? "rgba(231,76,60,0.1)" : isPreparing ? "rgba(52,152,219,0.1)" : "rgba(245,200,66,0.05)",
                            textDecoration: isDone || isCancelled ? "line-through" : "none"
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold" style={{ color: isDone ? "#2ECC71" : isCancelled ? "#E74C3C" : isPreparing ? "#3498DB" : "#F5C842" }}>
                              {item.quantity}x
                            </span>
                            <span style={{ color: isDone ? "#2ECC71" : isCancelled ? "#E74C3C" : isPreparing ? "#3498DB" : "#E8E8F0" }}>
                              {item.product_name}
                            </span>
                            {isPreparing && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(52,152,219,0.2)", color: "#3498DB" }}>
                                <Flame size={10} className="inline" /> Prep
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleStartPreparing(order.id, idx)}
                                  disabled={processing === `${order.id}-${idx}-prepare`}
                                  className="p-1.5 rounded-lg"
                                  style={{ background: "rgba(52,152,219,0.15)", color: "#3498DB" }}
                                  title="Start preparing"
                                >
                                  {processing === `${order.id}-${idx}-prepare` ? (
                                    <RefreshCw size={14} className="spin" />
                                  ) : (
                                    <Play size={14} />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleItemDone(order.id, idx)}
                                  disabled={processing === `${order.id}-${idx}`}
                                  className="p-1.5 rounded-lg"
                                  style={{ background: "rgba(46,204,113,0.15)", color: "#2ECC71" }}
                                  title="Mark done"
                                >
                                  {processing === `${order.id}-${idx}` ? (
                                    <RefreshCw size={14} className="spin" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleCancelItem(order.id, idx)}
                                  disabled={processing === `${order.id}-${idx}-cancel`}
                                  className="p-1.5 rounded-lg"
                                  style={{ background: "rgba(231,76,60,0.15)", color: "#E74C3C" }}
                                  title="Cancel item"
                                >
                                  {processing === `${order.id}-${idx}-cancel` ? (
                                    <RefreshCw size={14} className="spin" />
                                  ) : (
                                    <Ban size={14} />
                                  )}
                                </button>
                              </>
                            )}
                            {isPreparing && (
                              <>
                                <button
                                  onClick={() => handleItemDone(order.id, idx)}
                                  disabled={processing === `${order.id}-${idx}`}
                                  className="p-1.5 rounded-lg"
                                  style={{ background: "rgba(46,204,113,0.15)", color: "#2ECC71" }}
                                  title="Mark done"
                                >
                                  {processing === `${order.id}-${idx}` ? (
                                    <RefreshCw size={14} className="spin" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                </button>
                              </>
                            )}
                            {isDone && (
                              <Check size={14} style={{ color: "#2ECC71" }} />
                            )}
                            {isCancelled && (
                              <X size={14} style={{ color: "#E74C3C" }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!allDone ? (
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
                  ) : (
                    <button
                      onClick={() => handleRecallOrder(order.id)}
                      disabled={processing === order.id + "-recall"}
                      className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                      style={{ 
                        background: "rgba(52,152,219,0.15)", 
                        color: "#3498DB" 
                      }}
                    >
                      {processing === order.id + "-recall" ? (
                        <RefreshCw size={14} className="spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      Recall Order
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
