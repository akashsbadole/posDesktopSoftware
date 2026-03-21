"use client";
import { useState, useEffect } from "react";
import { getSuppliers, saveSupplier, deleteSupplier, getPurchaseOrders, savePurchaseOrder, updatePoStatus, receivePurchaseOrder, getIngredients, Supplier, PurchaseOrder, Ingredient } from "@/lib/db";
import { Plus, Trash2, Truck, Save, X, RefreshCw, ChevronDown, CheckCircle, Package } from "lucide-react";
import { v4 as uuid } from "uuid";

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"suppliers" | "po">("suppliers");
  const [showSupForm, setShowSupForm] = useState(false);
  const [showPoForm, setShowPoForm] = useState(false);
  const [supForm, setSupForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [poForm, setPoForm] = useState({ supplier_id: "", notes: "", items: [{ ingredient_id: "", quantity: 1, unit_cost: 0 }] });
  const [expandedPo, setExpandedPo] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sups, pos, ings] = await Promise.all([getSuppliers(), getPurchaseOrders(), getIngredients()]);
      setSuppliers(sups);
      setPurchaseOrders(pos);
      setIngredients(ings);
    } catch { }
    setLoading(false);
  };

  const handleSaveSup = async () => {
    await saveSupplier({ id: uuid(), ...supForm, created_at: new Date().toISOString() });
    setShowSupForm(false);
    setSupForm({ name: "", phone: "", email: "", address: "" });
    await loadData();
  };

  const handleDeleteSup = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    await deleteSupplier(id);
    await loadData();
  };

  const handleSavePo = async () => {
    const total = poForm.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const po: PurchaseOrder = {
      id: uuid(),
      supplier_id: poForm.supplier_id,
      supplier_name: suppliers.find(s => s.id === poForm.supplier_id)?.name || "",
      status: "draft",
      total,
      notes: poForm.notes,
      items: poForm.items.map(i => ({
        id: uuid(),
        ingredient_id: i.ingredient_id,
        ingredient_name: ingredients.find(ing => ing.id === i.ingredient_id)?.name || "",
        quantity: i.quantity,
        unit_cost: i.unit_cost,
      })),
      created_at: new Date().toISOString(),
    };
    await savePurchaseOrder(po);
    setShowPoForm(false);
    setPoForm({ supplier_id: "", notes: "", items: [{ ingredient_id: "", quantity: 1, unit_cost: 0 }] });
    await loadData();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (status === "received") {
      await receivePurchaseOrder(id);
    } else {
      await updatePoStatus(id, status);
    }
    await loadData();
  };

  const addPoItem = () => setPoForm({ ...poForm, items: [...poForm.items, { ingredient_id: "", quantity: 1, unit_cost: 0 }] });
  const removePoItem = (idx: number) => setPoForm({ ...poForm, items: poForm.items.filter((_, i) => i !== idx) });
  const updatePoItem = (idx: number, field: string, value: any) => {
    const items = [...poForm.items];
    (items[idx] as any)[field] = value;
    setPoForm({ ...poForm, items });
  };

  const getIngredientName = (id: string) => ingredients.find(i => i.id === id)?.name || id;

  const poStatusColor = (s: string) => {
    switch (s) {
      case "draft": return { bg: "rgba(144,144,168,0.1)", color: "#9090A8" };
      case "sent": return { bg: "rgba(52,152,219,0.1)", color: "#3498DB" };
      case "received": return { bg: "rgba(46,204,113,0.1)", color: "#2ECC71" };
      case "cancelled": return { bg: "rgba(231,76,60,0.1)", color: "#E74C3C" };
      default: return { bg: "#2A2A35", color: "#9090A8" };
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
              <Truck size={20} color="#0D0D0F" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Suppliers & Purchase Orders</h1>
              <p className="text-sm" style={{ color: "#9090A8" }}>Manage suppliers and procurement</p>
            </div>
          </div>
          <button onClick={loadData} className="p-2 rounded-lg hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab("suppliers")} className="px-4 py-2 rounded-lg text-sm font-medium" style={{
            background: activeTab === "suppliers" ? "#F5C842" : "#2A2A35",
            color: activeTab === "suppliers" ? "#0D0D0F" : "#9090A8",
          }}>Suppliers ({suppliers.length})</button>
          <button onClick={() => setActiveTab("po")} className="px-4 py-2 rounded-lg text-sm font-medium" style={{
            background: activeTab === "po" ? "#F5C842" : "#2A2A35",
            color: activeTab === "po" ? "#0D0D0F" : "#9090A8",
          }}>Purchase Orders ({purchaseOrders.length})</button>
        </div>

        {activeTab === "suppliers" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowSupForm(true)} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#F5C842", color: "#0D0D0F" }}>
                <Plus size={14} /> Add Supplier
              </button>
            </div>
            {showSupForm && (
              <div className="rounded-xl p-4 mb-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5C842" }}>New Supplier</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input value={supForm.name} onChange={e => setSupForm({ ...supForm, name: e.target.value })} placeholder="Name" className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                  <input value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} placeholder="Phone" className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                  <input value={supForm.email} onChange={e => setSupForm({ ...supForm, email: e.target.value })} placeholder="Email" className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                  <input value={supForm.address} onChange={e => setSupForm({ ...supForm, address: e.target.value })} placeholder="Address" className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveSup} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#2ECC71", color: "#0D0D0F" }}><Save size={14} /> Save</button>
                  <button onClick={() => setShowSupForm(false)} className="px-4 py-2 rounded-lg text-sm flex items-center gap-1" style={{ background: "#2A2A35", color: "#9090A8" }}><X size={14} /> Cancel</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {suppliers.map(s => (
                <div key={s.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: "#fff" }}>{s.name}</h3>
                    <div className="text-xs mt-1" style={{ color: "#9090A8" }}>{s.phone} {s.email && `| ${s.email}`}</div>
                    {s.address && <div className="text-xs mt-0.5" style={{ color: "#4A4A5A" }}>{s.address}</div>}
                  </div>
                  <button onClick={() => handleDeleteSup(s.id)} className="p-1.5 rounded" style={{ color: "#E74C3C" }}><Trash2 size={14} /></button>
                </div>
              ))}
              {suppliers.length === 0 && <div className="text-center py-12" style={{ color: "#4A4A5A" }}>No suppliers</div>}
            </div>
          </div>
        )}

        {activeTab === "po" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowPoForm(true)} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#F5C842", color: "#0D0D0F" }}>
                <Plus size={14} /> Create PO
              </button>
            </div>
            {showPoForm && (
              <div className="rounded-xl p-4 mb-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5C842" }}>New Purchase Order</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <select value={poForm.supplier_id} onChange={e => setPoForm({ ...poForm, supplier_id: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Notes" className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                </div>
                <div className="space-y-2 mb-3">
                  {poForm.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select value={item.ingredient_id} onChange={e => updatePoItem(idx, "ingredient_id", e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }}>
                        <option value="">Ingredient</option>
                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input type="number" value={item.quantity} onChange={e => updatePoItem(idx, "quantity", Number(e.target.value))} placeholder="Qty" className="w-20 px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                      <input type="number" value={item.unit_cost} onChange={e => updatePoItem(idx, "unit_cost", Number(e.target.value))} placeholder="Cost" className="w-24 px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                      {poForm.items.length > 1 && <button onClick={() => removePoItem(idx)} style={{ color: "#E74C3C" }}><X size={14} /></button>}
                    </div>
                  ))}
                  <button onClick={addPoItem} className="text-xs flex items-center gap-1" style={{ color: "#F5C842" }}><Plus size={12} /> Add Item</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSavePo} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#2ECC71", color: "#0D0D0F" }}><Save size={14} /> Save PO</button>
                  <button onClick={() => setShowPoForm(false)} className="px-4 py-2 rounded-lg text-sm flex items-center gap-1" style={{ background: "#2A2A35", color: "#9090A8" }}><X size={14} /> Cancel</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {purchaseOrders.map(po => (
                <div key={po.id} className="rounded-xl p-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm" style={{ color: "#9090A8" }}>#{po.id.slice(-6).toUpperCase()}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={poStatusColor(po.status)}>{po.status}</span>
                    </div>
                    <span className="font-bold" style={{ color: "#F5C842" }}>${po.total.toFixed(2)}</span>
                  </div>
                  <div className="text-sm mb-1" style={{ color: "#9090A8" }}>Supplier: <span style={{ color: "#fff" }}>{po.supplier_name}</span></div>
                  {po.notes && <div className="text-xs mb-2" style={{ color: "#4A4A5A" }}>{po.notes}</div>}
                  <div className="text-xs mb-2" style={{ color: "#4A4A5A" }}>{new Date(po.created_at).toLocaleString()}</div>
                  {po.status === "draft" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStatus(po.id, "sent")} className="text-xs px-2 py-1 rounded" style={{ color: "#3498DB", background: "rgba(52,152,219,0.1)" }}>Mark Sent</button>
                      <button onClick={() => handleUpdateStatus(po.id, "cancelled")} className="text-xs px-2 py-1 rounded" style={{ color: "#E74C3C", background: "rgba(231,76,60,0.1)" }}>Cancel</button>
                    </div>
                  )}
                  {po.status === "sent" && (
                    <button onClick={() => handleUpdateStatus(po.id, "received")} className="text-xs px-2 py-1 rounded flex items-center gap-1" style={{ color: "#2ECC71", background: "rgba(46,204,113,0.1)" }}>
                      <CheckCircle size={12} /> Mark Received
                    </button>
                  )}
                  {expandedPo === po.id && po.items.length > 0 && (
                    <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: "#2A2A35" }}>
                      {po.items.map(item => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span style={{ color: "#9090A8" }}>{item.ingredient_name} × {item.quantity}</span>
                          <span style={{ color: "#fff" }}>${(item.quantity * item.unit_cost).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setExpandedPo(expandedPo === po.id ? null : po.id)} className="text-xs mt-2 flex items-center gap-1" style={{ color: "#4A4A5A" }}>
                    <ChevronDown size={12} style={{ transform: expandedPo === po.id ? "rotate(180deg)" : undefined }} /> {po.items.length} items
                  </button>
                </div>
              ))}
              {purchaseOrders.length === 0 && <div className="text-center py-12" style={{ color: "#4A4A5A" }}>No purchase orders</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
