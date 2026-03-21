"use client";
import { useState, useEffect } from "react";
import { dbGetProducts, bulkUpdateStock, bulkUpdatePrice, bulkUpdateTax, Product } from "@/lib/db";
import { useNotificationStore } from "@/lib/stores";
import { Layers, DollarSign, Package, Tag, RefreshCw, Save } from "lucide-react";

export default function BulkOperationsScreen() {
  const { addNotification } = useNotificationStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stock" | "price" | "tax">("stock");
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("");
  const [newTax, setNewTax] = useState(18);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const p = await dbGetProducts();
      setProducts(p);
    } catch { }
    setLoading(false);
  };

  const handleBulkStock = async () => {
    const updates = Object.entries(selections).filter(([_, v]) => v !== 0);
    if (updates.length === 0) return;
    try {
      const count = await bulkUpdateStock(updates);
      addNotification({ type: "success", title: "Stock Updated", message: `${count} products updated` });
      setSelections({});
      await loadProducts();
    } catch (e: any) {
      addNotification({ type: "error", title: "Error", message: String(e) });
    }
  };

  const handleBulkPrice = async () => {
    const updates = Object.entries(selections).filter(([_, v]) => v > 0);
    if (updates.length === 0) return;
    try {
      const count = await bulkUpdatePrice(updates);
      addNotification({ type: "success", title: "Prices Updated", message: `${count} products updated` });
      setSelections({});
      await loadProducts();
    } catch (e: any) {
      addNotification({ type: "error", title: "Error", message: String(e) });
    }
  };

  const handleBulkTax = async () => {
    if (!category) return;
    try {
      const count = await bulkUpdateTax(category, newTax);
      addNotification({ type: "success", title: "Tax Updated", message: `${count} products in "${category}" set to ${newTax}%` });
      await loadProducts();
    } catch (e: any) {
      addNotification({ type: "error", title: "Error", message: String(e) });
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
            <Layers size={20} color="#0D0D0F" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Bulk Operations</h1>
            <p className="text-sm" style={{ color: "#9090A8" }}>Update stock, prices, or tax for multiple products</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(["stock", "price", "tax"] as const).map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setSelections({}); }} className="px-4 py-2 rounded-lg text-sm font-medium capitalize" style={{
              background: activeTab === t ? "#F5C842" : "#2A2A35",
              color: activeTab === t ? "#0D0D0F" : "#9090A8",
            }}>{t === "stock" ? "Stock" : t === "price" ? "Prices" : "Tax by Category"}</button>
          ))}
        </div>

        {activeTab === "tax" ? (
          <div className="rounded-xl p-5" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5C842" }}>Set Tax Rate for Category</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c} value={c}>{c} ({products.filter(p => p.category === c).length} items)</option>)}
              </select>
              <input type="number" value={newTax} onChange={e => setNewTax(Number(e.target.value))} placeholder="Tax %" className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
            </div>
            <button onClick={handleBulkTax} disabled={!category} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: "#F5C842", color: "#0D0D0F" }}>
              <Save size={14} className="inline mr-1" /> Apply Tax to All in Category
            </button>
          </div>
        ) : (
          <div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A35" }}>
              <div className="grid grid-cols-4 gap-2 p-3 text-xs font-semibold" style={{ background: "#1E1E26", color: "#9090A8" }}>
                <span>Product</span>
                <span>Category</span>
                <span>Current {activeTab === "stock" ? "Stock" : "Price"}</span>
                <span>New {activeTab === "stock" ? "Stock" : "Price"}</span>
              </div>
              {products.map(p => (
                <div key={p.id} className="grid grid-cols-4 gap-2 p-3 items-center" style={{ borderTop: "1px solid #2A2A35" }}>
                  <span className="text-sm" style={{ color: "#fff" }}>{p.name}</span>
                  <span className="text-xs" style={{ color: "#9090A8" }}>{p.category}</span>
                  <span className="text-sm font-mono" style={{ color: "#F5C842" }}>
                    {activeTab === "stock" ? p.stock : `$${p.price.toFixed(2)}`}
                  </span>
                  <input
                    type="number"
                    value={selections[p.id] ?? ""}
                    onChange={e => setSelections({ ...selections, [p.id]: Number(e.target.value) })}
                    placeholder={activeTab === "stock" ? String(p.stock) : String(p.price)}
                    className="px-2 py-1 rounded text-sm"
                    style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff", width: "100%" }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={activeTab === "stock" ? handleBulkStock : handleBulkPrice} disabled={Object.keys(selections).length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                <Save size={14} className="inline mr-1" /> Apply to {Object.keys(selections).length} Products
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
