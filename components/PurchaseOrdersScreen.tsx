"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, ClipboardList, Check, Package } from "lucide-react";
import { getPurchaseOrders, savePurchaseOrder, updatePoStatus, receivePurchaseOrder, getSuppliers, getIngredients, PurchaseOrder, PurchaseOrderItem, Supplier, Ingredient } from "@/lib/db";
import { v4 as uuid } from "uuid";

export default function PurchaseOrdersScreen() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [form, setForm] = useState<{ supplier_id: string; notes: string; items: PurchaseOrderItem[] }>({
    supplier_id: "", notes: "", items: []
  });

  const fetchData = async () => {
    try {
      const [poData, supData, ingData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getIngredients(),
      ]);
      setOrders(poData);
      setSuppliers(supData);
      setIngredients(ingData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { id: uuid(), ingredient_id: "", ingredient_name: "", quantity: 1, unit_cost: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, key: string, value: any) => {
    const items = [...form.items];
    items[index] = { ...items[index], [key]: value };
    if (key === "ingredient_id") {
      const ing = ingredients.find(i => i.id === value);
      if (ing) items[index].ingredient_name = ing.name;
    }
    setForm({ ...form, items });
  };

  const total = form.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

  const handleSave = async () => {
    if (!form.supplier_id || form.items.length === 0) return;
    try {
      const po: PurchaseOrder = {
        id: uuid(),
        supplier_id: form.supplier_id,
        supplier_name: suppliers.find(s => s.id === form.supplier_id)?.name || "",
        status: "draft",
        total,
        notes: form.notes,
        items: form.items,
        created_at: new Date().toISOString(),
      };
      await savePurchaseOrder(po);
      setShowForm(false);
      setForm({ supplier_id: "", notes: "", items: [] });
      await fetchData();
    } catch (err) {
      console.error("Failed to save purchase order:", err);
    }
  };

  const handleReceive = async (id: string) => {
    setProcessing(id);
    try {
      await receivePurchaseOrder(id);
      await fetchData();
    } catch (err) {
      console.error("Failed to receive PO:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setProcessing(id);
    try {
      await updatePoStatus(id, status);
      await fetchData();
    } catch (err) {
      console.error("Failed to update PO status:", err);
    } finally {
      setProcessing(null);
    }
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: "rgba(149,165,166,0.15)", color: "#95A5A6" },
    sent: { bg: "rgba(52,152,219,0.15)", color: "#3498DB" },
    received: { bg: "rgba(46,204,113,0.15)", color: "#2ECC71" },
    cancelled: { bg: "rgba(231,76,60,0.15)", color: "#E74C3C" },
  };

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
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <ClipboardList size={24} style={{ color: "#F5C842" }} />
          Purchase Orders
        </h1>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-ghost py-2 px-3" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setForm({ supplier_id: "", notes: "", items: [] }); setShowForm(true); }} className="btn-accent py-2 px-4 flex items-center gap-2 text-sm">
            <Plus size={16} /> New PO
          </button>
        </div>
      </div>

      {/* Create PO Modal */}
       {showForm && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8" 
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
           <div className="card p-6 w-full max-w-lg fade-in">
             <h2 className="font-semibold text-lg mb-4">New Purchase Order</h2>
             <div className="space-y-3">
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Supplier *</label>
                 <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} style={{ padding: "10px" }}>
                   <option value="">Select supplier...</option>
                   {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
               </div>
               <div>
                 <div className="flex items-center justify-between mb-2">
                   <label className="text-xs" style={{ color: "#4A4A5A" }}>Items</label>
                   <button onClick={addItem} className="btn-ghost py-1 px-2 text-xs flex items-center gap-1">
                     <Plus size={12} /> Add Item
                   </button>
                 </div>
                 {form.items.map((item, idx) => (
                   <div key={item.id} className="flex gap-2 mb-2 items-center">
                     <select value={item.ingredient_id} onChange={(e) => updateItem(idx, "ingredient_id", e.target.value)} className="flex-1" style={{ padding: "8px" }}>
                       <option value="">Select ingredient...</option>
                       {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                     </select>
                     <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} min={0} style={{ width: 70 }} placeholder="Qty" />
                     <input type="number" value={item.unit_cost} onChange={(e) => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)} min={0} style={{ width: 80 }} placeholder="Cost" />
                     <button onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-500/10" style={{ color: "#E74C3C" }}>
                       <Trash2 size={14} />
                     </button>
                   </div>
                 ))}
               </div>
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Notes</label>
                 <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Order notes" rows={2} />
               </div>
               <div className="text-right font-semibold" style={{ color: "#F5C842" }}>
                 Total: {total.toFixed(2)}
               </div>
             </div>
             <div className="flex gap-2 mt-4">
               <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
               <button onClick={handleSave} className="btn-accent flex-1" disabled={!form.supplier_id || form.items.length === 0}>Save Draft</button>
             </div>
           </div>
         </div>
       )}

      {/* PO List */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: "#4A4A5A" }}>
          <ClipboardList size={48} className="mb-4 opacity-50" />
          <p>No purchase orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((po) => {
            const sc = statusColors[po.status] || statusColors.draft;
            return (
              <div key={po.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold">PO #{po.id.slice(-6).toUpperCase()}</div>
                    <div className="text-xs" style={{ color: "#9090A8" }}>{po.supplier_name} • {new Date(po.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
                    {po.status.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {po.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span style={{ color: "#9090A8" }}>{item.ingredient_name} x{item.quantity}</span>
                      <span>{(item.quantity * item.unit_cost).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <span className="font-semibold" style={{ color: "#F5C842" }}>Total: {po.total.toFixed(2)}</span>
                  <div className="flex gap-2">
                    {po.status === "draft" && (
                      <button onClick={() => handleStatusChange(po.id, "sent")} disabled={processing === po.id} className="btn-ghost py-1 px-3 text-xs">
                        {processing === po.id ? <RefreshCw size={12} className="spin" /> : "Mark Sent"}
                      </button>
                    )}
                    {(po.status === "sent" || po.status === "draft") && (
                      <button onClick={() => handleReceive(po.id)} disabled={processing === po.id} className="btn-success py-1 px-3 text-xs flex items-center gap-1">
                        {processing === po.id ? <RefreshCw size={12} className="spin" /> : <><Check size={12} /> Receive</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
