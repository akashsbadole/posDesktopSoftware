"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Search, RefreshCw, AlertCircle } from "lucide-react";
import { dbSaveProduct, dbDeleteProduct, Product } from "@/lib/db";
import { useProductsStore, useSettingsStore } from "@/lib/stores";
import { v4 as uuid } from "uuid";

const EMPTY: Product = { id: "", name: "", price: 0, category: "Food", stock: 0, barcode: "", tax: 18 };
const CATEGORIES = ["Beverages", "Food", "Snacks", "Bakery", "Electronics", "Other"];
const ITEMS_PER_PAGE = 30;

const validateProduct = (product: Product): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!product.name || product.name.trim().length === 0) {
    errors.name = "Product name is required";
  }
  
  if (isNaN(product.price) || product.price < 0) {
    errors.price = "Price must be a positive number";
  }
  
  if (isNaN(product.tax) || product.tax < 0 || product.tax > 100) {
    errors.tax = "Tax must be between 0 and 100";
  }
  
  if (isNaN(product.stock) || product.stock < 0) {
    errors.stock = "Stock must be a non-negative number";
  }
  
  return errors;
};

export default function ProductsScreen() {
  const { products, isLoading, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductsStore();
  const { settings, fetchSettings } = useSettingsStore();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);

  useEffect(() => { 
    fetchProducts(); 
    fetchSettings();
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  );

  const displayedProducts = filtered.slice(0, displayLimit);
  const hasMore = displayLimit < filtered.length;

  useEffect(() => { setDisplayLimit(ITEMS_PER_PAGE); }, [search]);

  const handleSave = async () => {
    if (!editing || !editing.name) return;
    const product = { ...editing, id: editing.id || uuid() };
    if (editing.id) {
      await updateProduct(product);
    } else {
      await addProduct(product);
    }
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteProduct(id);
  };

  const curr = settings?.currency_symbol ?? "₹";

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display text-xl font-bold">Products</h1>
          <div className="flex gap-2">
            <button onClick={() => fetchProducts()} className="btn-ghost py-2 px-3"><RefreshCw size={14} className={isLoading ? "spin" : ""} /></button>
            <button className="btn-accent flex items-center gap-2 text-sm" onClick={() => setEditing({ ...EMPTY })}>
              <Plus size={15} /> Add Product
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} />
          <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full" style={{ color: "#4A4A5A" }}><RefreshCw size={24} className="spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: "#0D0D0F" }}>
                <tr style={{ color: "#4A4A5A", fontSize: 11 }}>
                  <th className="text-left pb-3 pl-3">PRODUCT</th>
                  <th className="text-left pb-3">CATEGORY</th>
                  <th className="text-right pb-3">PRICE</th>
                  <th className="text-right pb-3">TAX</th>
                  <th className="text-right pb-3">STOCK</th>
                  <th className="text-right pb-3 pr-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {displayedProducts.map((p) => (
                  <tr key={p.id} className="card-hover" style={{ borderTop: "1px solid #141418" }}>
                    <td className="py-3 pl-3">
                      <div className="font-medium">{p.name}</div>
                      {p.barcode && <div className="text-xs font-mono" style={{ color: "#4A4A5A" }}>#{p.barcode}</div>}
                    </td>
                    <td><span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1A1A22", color: "#9090A8" }}>{p.category}</span></td>
                    <td className="text-right font-semibold" style={{ color: "#F5C842" }}>{curr}{p.price.toFixed(2)}</td>
                    <td className="text-right" style={{ color: "#9090A8" }}>{p.tax}%</td>
                    <td className="text-right">
                      <span style={{ color: p.stock > 10 ? "#2ECC71" : p.stock > 0 ? "#F5C842" : "#E74C3C", fontWeight: 600 }}>{p.stock}</span>
                    </td>
                    <td className="text-right pr-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing({ ...p })} className="p-1.5 rounded-lg" style={{ color: "#9090A8" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#F5C842")} onMouseLeave={(e) => (e.currentTarget.style.color = "#9090A8")}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg" style={{ color: "#9090A8" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#E74C3C")} onMouseLeave={(e) => (e.currentTarget.style.color = "#9090A8")}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {hasMore && <div className="text-center py-4">
            <button onClick={() => setDisplayLimit(d => d + ITEMS_PER_PAGE)} className="btn-ghost text-sm">
              Show More ({filtered.length - displayLimit} more)
            </button>
          </div>}
        </div>
      </div>

      {editing && (
        <div className="border-l border-border p-5 overflow-y-auto slide-in" style={{ width: 300 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold">{editing.id ? "Edit" : "Add"} Product</h2>
            <button onClick={() => setEditing(null)} style={{ color: "#4A4A5A" }}><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Name *</label>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Product name" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Category</label>
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Price ({curr})</label>
                <input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} min={0} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Tax %</label>
                <input type="number" value={editing.tax} onChange={(e) => setEditing({ ...editing, tax: parseFloat(e.target.value) || 0 })} min={0} max={100} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Stock</label>
                <input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: parseInt(e.target.value) || 0 })} min={0} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Barcode</label>
                <input value={editing.barcode || ""} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="btn-accent flex-1 flex items-center justify-center gap-2 py-2.5 text-sm" onClick={handleSave}>
                <Check size={15} /> Save
              </button>
              <button className="btn-ghost py-2.5 px-4 text-sm" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
