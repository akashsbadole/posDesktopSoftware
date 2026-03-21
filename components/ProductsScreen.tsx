"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Search, RefreshCw, AlertCircle } from "lucide-react";
import { dbSaveProduct, dbDeleteProduct, Product } from "@/lib/db";
import { useProductsStore, useSettingsStore } from "@/lib/stores";
import { v4 as uuid } from "uuid";
import { getStoreTypeConfig } from "@/lib/storeTypes";

const EMPTY: Product = { id: "", name: "", price: 0, category: "Food", stock: 0, barcode: "", tax: 18, variants: "{}" };
const CATEGORIES = ["Beverages", "Food", "Snacks", "Bakery", "Clothing", "Accessories", "Electronics", "Stationery", "Grocery", "Medicine", "Other"];
const ITEMS_PER_PAGE = 30;

const validateProduct = (product: Product): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!product.name || product.name.trim().length === 0) {
    errors.name = "Product name is required";
  }
  
  if (isNaN(product.price) || product.price < 0) {
    errors.price = "Price must be a positive number";
  }
  
  if (isNaN(product.stock) || product.stock < 0) {
    errors.stock = "Stock must be a non-negative number";
  }
  
  return errors;
};

export default function ProductsScreen() {
  const { products, isLoading, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductsStore();
  const { settings } = useSettingsStore();
  const storeConfig = getStoreTypeConfig(settings?.store_type || "food");
  const curr = settings?.currency ?? "₹";
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);

  useEffect(() => { fetchProducts(); }, []);

  // Parse variants JSON from product
  const getVariantValue = (product: Product, key: string): string => {
    try {
      const v = JSON.parse(product.variants || "{}");
      return v[key] || "";
    } catch { return ""; }
  };

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      return !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.barcode?.includes(search);
    });

  const displayedProducts = filtered.slice(0, displayLimit);

  const handleSave = async () => {
    if (!editing) return;
    const validationErrors = validateProduct(editing);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    try {
      if (editing.id) {
        await updateProduct(editing);
      } else {
        await addProduct({ ...editing, id: uuid() });
      }
      setEditing(null);
    } catch (err) {
      console.error("Failed to save product:", err);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-bold">{storeConfig.labels.products}</h1>
          <div className="flex gap-2">
            <button onClick={() => fetchProducts()} className="btn-ghost py-2 px-3"><RefreshCw size={14} className={isLoading ? "spin" : ""} /></button>
            <button onClick={() => setEditing({ ...EMPTY })} className="btn-accent flex items-center gap-2 py-2 px-3">
              <Plus size={15} /> Add {storeConfig.labels.product}
            </button>
          </div>
        </div>
        <div className="mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} />
            <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "#4A4A5A" }} className="text-xs uppercase">
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">{storeConfig.labels.productCategory}</th>
                <th className="text-right py-2 px-3">Price</th>
                <th className="text-right py-2 px-3">Stock</th>
                <th className="text-left py-2 px-3">Barcode</th>
                <th className="text-center py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-[#1E1E26]">
                  <td className="py-2.5 px-3 font-medium">
                    <div>{p.name}</div>
                    {/* Show variant info inline */}
                    {storeConfig.variantFields.length > 0 && (
                      <div className="text-xs" style={{ color: "#4A4A5A" }}>
                        {storeConfig.variantFields.map((vf) => {
                          const val = getVariantValue(p, vf.key);
                          return val ? `${vf.label}: ${val}` : null;
                        }).filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3" style={{ color: "#9090A8" }}>{p.category}</td>
                  <td className="py-2.5 px-3 text-right font-semibold" style={{ color: "#F5C842" }}>{curr}{p.price.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span style={{ color: p.stock === 0 ? "#E74C3C" : p.stock <= 5 ? "#F5C842" : "#2ECC71" }}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs" style={{ color: "#9090A8" }}>{p.barcode}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => setEditing({ ...p })} className="btn-ghost p-1.5"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} className="btn-ghost p-1.5" style={{ color: "#E74C3C" }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8" style={{ color: "#4A4A5A" }}>No products found</div>}
          {filtered.length > displayLimit && (
            <div className="text-center py-3">
              <button onClick={() => setDisplayLimit(d => d + ITEMS_PER_PAGE)} className="btn-ghost text-sm">
                Show More ({filtered.length - displayLimit} more)
              </button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="border-l border-border p-5 overflow-y-auto slide-in" style={{ width: 320 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold">{editing.id ? "Edit" : "Add"} {storeConfig.labels.product}</h2>
            <button onClick={() => setEditing(null)} style={{ color: "#4A4A5A" }}><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Name *</label>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={`${storeConfig.labels.product} name`} />
              {errors.name && <div className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.name}</div>}
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>{storeConfig.labels.productCategory}</label>
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Price ({curr})</label>
                <input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} min={0} />
                {errors.price && <div className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.price}</div>}
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
                {errors.stock && <div className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.stock}</div>}
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Barcode</label>
                <input value={editing.barcode || ""} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} placeholder="Scan or type" />
              </div>
            </div>

            {/* Variant fields based on store type */}
            {storeConfig.variantFields.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs font-semibold mb-2" style={{ color: "#9090A8" }}>Variant Details</div>
                <div className="space-y-2">
                  {storeConfig.variantFields.map((vf) => {
                    const currentVariants = (() => { try { return JSON.parse(editing.variants || "{}"); } catch { return {}; } })();
                    const updateVariant = (key: string, value: string) => {
                      const updated = { ...currentVariants, [key]: value };
                      setEditing({ ...editing, variants: JSON.stringify(updated) });
                    };
                    if (vf.type === "select" && vf.options) {
                      return (
                        <div key={vf.key}>
                          <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>{vf.label}</label>
                          <select value={currentVariants[vf.key] || ""} onChange={(e) => updateVariant(vf.key, e.target.value)}>
                            <option value="">Select {vf.label}</option>
                            {vf.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                      );
                    }
                    return (
                      <div key={vf.key}>
                        <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>{vf.label}</label>
                        <input
                          value={currentVariants[vf.key] || ""}
                          onChange={(e) => updateVariant(vf.key, e.target.value)}
                          placeholder={vf.label}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
