"use client";
import { useEffect, useState } from "react";
import { Search, RotateCcw, ChevronDown, ChevronUp, RefreshCw, Truck, MapPin, Phone, Edit2, Plus, Minus, X, ChevronLeft, ChevronRight, MessageSquare, Ban, Banknote } from "lucide-react";
import { updateDeliveryStatus, dbCancelOrder, dbAddOrderNote, dbGetOrderNotes, dbCreateRefundRequest, Order, OrderItem, OrderNote } from "@/lib/db";
import { useOrdersStore, useSettingsStore, useProductsStore, useCartStore, useAuthStore } from "@/lib/stores";

const ITEMS_PER_PAGE = 20;

export default function OrdersScreen() {
  const { activeStoreId } = useSettingsStore();
  const { orders, isLoading, fetchOrders, refundOrder, updateDeliveryStatus: updateStatus, updateOrder, filterStatus, setFilterStatus } = useOrdersStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { products, fetchProducts } = useProductsStore();
  const { addItem, items: cartItems, updateQuantity, removeItem, clearCart, setOrderType, setCustomerInfo, setOriginalOrderId } = useCartStore();
  const { user } = useAuthStore();
  
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<{ productId: string; productName: string; price: number; quantity: number; discount: number; tax: number }[]>([]);
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [orderNotes, setOrderNotes] = useState<Record<string, OrderNote[]>>({});
  const [newNote, setNewNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);

  useEffect(() => { 
    fetchOrders(); 
    fetchSettings();
    fetchProducts();
  }, [activeStoreId]);

  const [refundReason, setRefundReason] = useState("");
  const [showRefundModal, setShowRefundModal] = useState<string | null>(null);

  const handleRefund = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order?.status === "processing") {
      if (!confirm("This order needs payment. Continue to POS?")) return;
      clearCart();
      for (const item of order.items) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          addItem(product, item.quantity);
        }
      }
      setOrderType(order.order_type as "dine_in" | "takeaway" | "delivery");
      if (order.customer_name || order.delivery_phone || order.delivery_address) {
        setCustomerInfo({ 
          name: order.customer_name || "", 
          phone: order.delivery_phone || "", 
          address: order.delivery_address || "" 
        });
      }
      setOriginalOrderId(order.id);
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'pos' }));
      return;
    }
    setShowRefundModal(id);
  };

  const handleConfirmRefund = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    if (!refundReason.trim()) return;
    const reason = refundReason.trim();
    setShowRefundModal(null);
    setRefundReason("");
    await dbCreateRefundRequest(id, order.total, reason, activeStoreId);
    alert("Refund request created. Please approve from Refund Requests screen.");
  };

  const handleDeliveryStatus = async (id: string, status: string) => {
    await updateStatus(id, status as any);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditItems(order.items.map(item => ({
      productId: item.product_id,
      productName: item.product_name,
      price: item.price,
      quantity: item.quantity,
      discount: item.discount,
      tax: item.tax
    })));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    
    const subtotal = editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = editItems.reduce((sum, item) => sum + (item.price * item.quantity * item.discount / 100), 0);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = editItems.reduce((sum, item) => sum + (item.price * item.quantity * (1 - item.discount / 100) * (item.tax / 100)), 0);
    const total = afterDiscount + taxAmount;

    const updatedOrder: Order = {
      ...editingOrder,
      items: editItems.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        price: item.price,
        quantity: item.quantity,
        discount: item.discount,
        tax: item.tax
      })),
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total
    };

    await updateOrder(updatedOrder);
    setEditingOrder(null);
    setEditItems([]);
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
    setEditItems([]);
  };

  const handleCancelOrder = async (id: string) => {
    if (!cancelReason.trim()) return;
    const userId = user?.id || "system";
    const userName = user?.name || "System";
    await dbCancelOrder(id, cancelReason, userId, userName, activeStoreId);
    setShowCancelModal(null);
    setCancelReason("");
    await fetchOrders();
  };

  const handleAddNote = async (orderId: string) => {
    if (!newNote.trim()) return;
    await dbAddOrderNote(orderId, newNote, activeStoreId);
    setNewNote("");
    const notes = await dbGetOrderNotes(orderId, activeStoreId);
    setOrderNotes(prev => ({ ...prev, [orderId]: notes }));
  };

  const loadOrderNotes = async (orderId: string) => {
    if (orderNotes[orderId]) return;
    try {
      const notes = await dbGetOrderNotes(orderId, activeStoreId);
      setOrderNotes(prev => ({ ...prev, [orderId]: notes }));
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  };

  const updateEditItemQuantity = (productId: string, delta: number) => {
    setEditItems(items => items.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case "pending": return { bg: "rgba(245,200,66,0.1)", color: "#F5C842" };
      case "out_for_delivery": return { bg: "rgba(52,152,219,0.1)", color: "#3498DB" };
      case "delivered": return { bg: "rgba(46,204,113,0.1)", color: "#2ECC71" };
      case "cancelled": return { bg: "rgba(231,76,60,0.1)", color: "#E74C3C" };
      default: return { bg: "rgba(144,144,168,0.1)", color: "#9090A8" };
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "completed": return { bg: "rgba(46,204,113,0.1)", color: "#2ECC71" };
      case "refunded": return { bg: "rgba(231,76,60,0.1)", color: "#E74C3C" };
      case "cancelled": return { bg: "rgba(231,76,60,0.1)", color: "#E74C3C" };
      case "processing": return { bg: "rgba(52,152,219,0.1)", color: "#3498DB" };
      case "hold": return { bg: "rgba(245,200,66,0.1)", color: "#F5C842" };
      default: return { bg: "rgba(144,144,168,0.1)", color: "#9090A8" };
    }
  };

  const filtered = orders.filter((o) => {
    const ms = search === "" || o.id.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase());
    const mf = filterStatus === "all" || o.status === filterStatus;
    return ms && mf;
  });

  const displayedOrders = filtered.slice(0, displayLimit);
  const hasMore = displayLimit < filtered.length;

  useEffect(() => { setDisplayLimit(ITEMS_PER_PAGE); }, [search, filterStatus]);

  const curr = settings?.currency_symbol ?? "₹";

  const editSubtotal = editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const editDiscount = editItems.reduce((sum, item) => sum + (item.price * item.quantity * item.discount / 100), 0);
  const editTax = editItems.reduce((sum, item) => sum + (item.price * item.quantity * (1 - item.discount / 100) * (item.tax / 100)), 0);
  const editTotal = editSubtotal - editDiscount + editTax;

  if (editingOrder) {
    return (
      <div className="h-full flex flex-col p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={handleCancelEdit} className="btn-ghost py-2 px-3">← Back</button>
            <h1 className="font-display text-xl font-bold font-display">Edit Order #{editingOrder.id.slice(-6).toUpperCase()}</h1>
          </div>
          <button onClick={handleSaveEdit} className="btn-accent py-2 px-4">Save Changes</button>
        </div>

        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">Order Items</h2>
          {editItems.length === 0 ? (
            <div className="text-center py-4" style={{ color: "#4A4A5A" }}>No items in order</div>
          ) : (
            <div className="space-y-2">
              {editItems.map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#1E1E26" }}>
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs" style={{ color: "#4A4A5A" }}>{curr}{item.price} each</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateEditItemQuantity(item.productId, -1)} className="btn-ghost p-1">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateEditItemQuantity(item.productId, 1)} className="btn-ghost p-1">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="w-20 text-right font-medium" style={{ color: "#F5C842" }}>
                    {curr}{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4 mt-auto">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: "#9090A8" }}>Subtotal</span><span>{curr}{editSubtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span style={{ color: "#9090A8" }}>Discount</span><span style={{ color: "#2ECC71" }}>-{curr}{editDiscount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span style={{ color: "#9090A8" }}>Tax</span><span>+{curr}{editTax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <span>Total</span><span style={{ color: "#F5C842" }}>{curr}{editTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold font-display">Orders</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "#4A4A5A" }}>{filtered.length} orders</span>
          <button onClick={() => fetchOrders()} className="btn-ghost py-2 px-3"><RefreshCw size={14} className={isLoading ? "spin" : ""} /></button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} />
          <input placeholder="Search by ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <div className="flex gap-1">
          {(["all", "processing", "completed", "refunded", "cancelled"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide"
              style={{
                background: filterStatus === s ? "rgba(245,200,66,0.1)" : "#141418",
                border: `1px solid ${filterStatus === s ? "rgba(245,200,66,0.2)" : "#1E1E26"}`,
                color: filterStatus === s ? "#F5C842" : "#4A4A5A",
              }}>
              {s === "processing" ? "KOT" : s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: "#4A4A5A" }}>
          <RefreshCw size={24} className="spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#4A4A5A" }}>
              <p>No orders found</p>
            </div>
          ) : (
            displayedOrders.map((order) => (
              <div key={order.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm" style={{ color: "#9090A8" }}>#{order.id.slice(-6).toUpperCase()}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={getOrderStatusColor(order.status)}>
                      {order.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: "rgba(144,144,168,0.1)", color: "#9090A8" }}>
                      {order.order_type}
                    </span>
                  </div>
                  <span className="font-semibold" style={{ color: "#F5C842" }}>{curr}{order.total.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-sm mb-3" style={{ color: "#9090A8" }}>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                  <span>{order.items.length} items</span>
                </div>

                {order.order_type === "delivery" && (
                  <div className="mb-3 p-2 rounded-lg" style={{ background: "rgba(52,152,219,0.06)", border: "1px solid rgba(52,152,219,0.15)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck size={14} style={{ color: "#3498DB" }} />
                      <span className="text-xs font-semibold" style={{ color: "#3498DB" }}>Delivery</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={getDeliveryStatusColor(order.delivery_status)}>
                        {order.delivery_status.replace("_", " ")}
                      </span>
                    </div>
                    {order.delivery_address && <div className="flex items-center gap-1 text-xs" style={{ color: "#9090A8" }}><MapPin size={12} />{order.delivery_address}</div>}
                    {order.delivery_phone && <div className="flex items-center gap-1 text-xs" style={{ color: "#9090A8" }}><Phone size={12} />{order.delivery_phone}</div>}
                    {order.delivery_status === "pending" && (
                      <button onClick={() => handleDeliveryStatus(order.id, "out_for_delivery")}
                        className="mt-2 btn-ghost text-xs py-1 px-2">
                        Mark Out for Delivery
                      </button>
                    )}
                    {order.delivery_status === "out_for_delivery" && (
                      <button onClick={() => handleDeliveryStatus(order.id, "delivered")}
                        className="mt-2 btn-ghost text-xs py-1 px-2">
                        Mark Delivered
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setExpanded(expanded === order.id ? null : order.id);
                        if (expanded !== order.id) loadOrderNotes(order.id);
                      }}
                      className="text-xs flex items-center gap-1"
                      style={{ color: "#9090A8" }}
                    >
                      {expanded === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expanded === order.id ? "Hide" : "Show"} items
                    </button>
                    {order.status === "completed" && (
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-xs flex items-center gap-1 px-2 py-1 rounded"
                        style={{ color: "#3498DB", background: "rgba(52,152,219,0.1)" }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    )}
                  </div>

                  {(order.status === "completed" || order.status === "processing") && (
                    <button
                      onClick={() => handleRefund(order.id)}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded"
                      style={{ color: order.status === "processing" ? "#3498DB" : "#E74C3C", background: order.status === "processing" ? "rgba(52,152,219,0.1)" : "rgba(231,76,60,0.1)" }}
                    >
                      {order.status === "processing" ? <Banknote size={12} /> : <RotateCcw size={12} />} 
                      {order.status === "processing" ? "Pay Now" : "Refund"}
                    </button>
                  )}
                  {order.status === "completed" && (
                    <button
                      onClick={() => setShowCancelModal(order.id)}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded"
                      style={{ color: "#F39C12", background: "rgba(243,156,18,0.1)" }}
                    >
                      <Ban size={12} /> Cancel
                    </button>
                  )}
                </div>

                {expanded === order.id && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span style={{ color: "#9090A8" }}>{item.product_name} × {item.quantity}</span>
                        <span>{curr}{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <div className="flex justify-between text-sm"><span style={{ color: "#9090A8" }}>Subtotal</span><span>{curr}{order.subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm"><span style={{ color: "#9090A8" }}>Tax</span><span>+{curr}{order.tax_amount.toFixed(2)}</span></div>
                      {order.discount_amount > 0 && <div className="flex justify-between text-sm"><span style={{ color: "#2ECC71" }}>Discount</span><span>-{curr}{order.discount_amount.toFixed(2)}</span></div>}
                      <div className="flex justify-between font-semibold mt-1"><span>Total</span><span style={{ color: "#F5C842" }}>{curr}{order.total.toFixed(2)}</span></div>
                    </div>

                    {/* Order Notes */}
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={14} style={{ color: "#9090A8" }} />
                        <span className="text-xs font-semibold" style={{ color: "#9090A8" }}>Order Notes</span>
                      </div>
                      {(orderNotes[order.id] || []).length > 0 && (
                        <div className="space-y-1 mb-2">
                          {(orderNotes[order.id] || []).map((note) => (
                            <div key={note.id} className="text-xs p-2 rounded" style={{ background: "#1E1E26", color: "#9090A8" }}>
                              {note.note}
                              <span className="ml-2" style={{ color: "#4A4A5A" }}>{new Date(note.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add a note..."
                          className="flex-1 text-xs"
                          style={{ padding: "6px 10px" }}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(order.id); }}
                        />
                        <button onClick={() => handleAddNote(order.id)} className="btn-ghost py-1 px-2 text-xs" disabled={!newNote.trim()}>
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {hasMore && (
            <div className="text-center pt-4">
              <button 
                onClick={() => setDisplayLimit(d => d + ITEMS_PER_PAGE)}
                className="btn-ghost text-sm"
              >
                Show More ({filtered.length - displayLimit} more)
              </button>
            </div>
          )}
        </div>
      )}

       {/* Cancel Order Modal */}
       {showCancelModal && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setShowCancelModal(null)}
        >
           <div className="card p-6 w-full max-w-md fade-in">
             <div className="flex items-center justify-between mb-4">
               <h2 className="font-semibold text-base">Cancel Order #{showCancelModal.slice(-6).toUpperCase()}</h2>
               <button 
                 onClick={() => { setShowCancelModal(null); setCancelReason(""); }} 
                 className="btn-ghost py-1 px-3"
                 aria-label="Close"
               >
                 <X size={16} />
               </button>
             </div>
             <div className="mb-4">
               <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Reason for cancellation *</label>
               <textarea
                 value={cancelReason}
                 onChange={(e) => setCancelReason(e.target.value)}
                 placeholder="Enter reason..."
                 rows={3}
               />
             </div>
             <div className="flex gap-2">
               <button onClick={() => { setShowCancelModal(null); setCancelReason(""); }} className="btn-ghost flex-1">Close</button>
               <button onClick={() => handleCancelOrder(showCancelModal)} className="btn-danger flex-1" disabled={!cancelReason.trim()}>
                 Confirm Cancel
               </button>
             </div>
           </div>
         </div>
        )}

       {/* Refund Request Modal */}
       {showRefundModal && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center" 
           style={{ background: "rgba(0,0,0,0.6)" }}
           onClick={(e) => e.target === e.currentTarget && setShowRefundModal(null)}
         >
            <div className="card p-6 w-full max-w-md fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-base">Request Refund</h2>
                <button 
                  onClick={() => { setShowRefundModal(null); setRefundReason(""); }} 
                  className="btn-ghost py-1 px-3"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mb-4">
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Reason for refund *</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowRefundModal(null); setRefundReason(""); }} className="btn-ghost flex-1">Close</button>
                <button onClick={() => handleConfirmRefund(showRefundModal)} className="btn-danger flex-1" disabled={!refundReason.trim()}>
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
     </div>
   );
 }
