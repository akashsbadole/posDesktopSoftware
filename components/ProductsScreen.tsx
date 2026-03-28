"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Search, RefreshCw, Package, Image, Tag, Star, GripVertical, Clock, ShieldCheck, Calendar } from "lucide-react";
import { dbSaveProduct, dbDeleteProduct, Product, dbGetCombos, dbSaveCombo, dbDeleteCombo, dbToggleCombo, Combo, ComboItem } from "@/lib/db";
import { useProductsStore, useSettingsStore, useStoresStore } from "@/lib/stores";
import { v4 as uuid } from "uuid";

const EMPTY_PRODUCT: Product = { id: "", store_id: "", name: "", price: 0, category: "Food", stock: 0, barcode: "", tax: 18, image_url: "" };
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

const EMPTY_COMBO: Combo = {
  id: "",
  store_id: "",
  name: "",
  description: "",
  items: [],
  combo_price: 0,
  discount_amount: 0,
  discount_percent: 0,
  is_active: true,
};

export default function ProductsScreen() {
  const { activeStoreId } = useSettingsStore();
  const { stores } = useStoresStore();
  const { products, isLoading, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductsStore();
  const { settings, fetchSettings } = useSettingsStore();

  const activeStore = stores.find(s => s.id === activeStoreId);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [view, setView] = useState<"products" | "combos">("products");
  const [combos, setCombos] = useState<Combo[]>([]);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);

  useEffect(() => { 
    fetchProducts(); 
    fetchSettings();
    fetchCombos();
  }, [activeStoreId]);

  const fetchCombos = async () => {
    try {
      const data = await dbGetCombos(activeStoreId);
      setCombos(data);
    } catch (err) {
      console.error("Failed to fetch combos:", err);
    }
  };

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
    const errors = validateProduct(editing);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }
    try {
      const product = { ...editing, id: editing.id || uuid(), store_id: activeStoreId };
      if (editing.id) {
        await updateProduct(product);
      } else {
        await addProduct(product);
      }
      setEditing(null);
      setErrors({});
    } catch (err) {
      console.error("Failed to save product:", err);
      alert("Failed to save product. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product. Please try again.");
    }
  };

  const handleSaveCombo = async () => {
    if (!editingCombo || !editingCombo.name) return;
    if (comboItems.length === 0) {
      alert("Please add at least one item to the combo");
      return;
    }
    const totalItemsPrice = comboItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = totalItemsPrice - editingCombo.combo_price;
    const discountPercent = totalItemsPrice > 0 ? (discount / totalItemsPrice) * 100 : 0;
    
    const combo: Combo = {
      ...editingCombo,
      id: editingCombo.id || uuid(),
      store_id: activeStoreId,
      items: comboItems,
      discount_amount: discount,
      discount_percent: discountPercent,
    };
    
    await dbSaveCombo(combo, activeStoreId);
    await fetchCombos();
    setEditingCombo(null);
    setComboItems([]);
  };

  const handleDeleteCombo = async (id: string) => {
    if (!confirm("Delete this combo?")) return;
    await dbDeleteCombo(id, activeStoreId);
    await fetchCombos();
  };

  const handleToggleCombo = async (id: string, currentActive: boolean) => {
    await dbToggleCombo(id, !currentActive, activeStoreId);
    await fetchCombos();
  };

  const addItemToCombo = (product: Product) => {
    const existing = comboItems.find(item => item.product_id === product.id);
    if (existing) {
      setComboItems(comboItems.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setComboItems([...comboItems, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
      }]);
    }
  };

  const removeItemFromCombo = (productId: string) => {
    setComboItems(comboItems.filter(item => item.product_id !== productId));
  };

  const updateComboItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeItemFromCombo(productId);
      return;
    }
    setComboItems(comboItems.map(item =>
      item.product_id === productId ? { ...item, quantity: qty } : item
    ));
  };

  const calculateComboPrice = () => {
    return comboItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const curr = settings?.currency_symbol ?? "₹";

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display text-xl font-bold font-display">Products</h1>
          <div className="flex gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ background: "#1E1E26" }}>
              <button
                onClick={() => setView("products")}
                className="px-3 py-2 text-xs font-medium transition-colors"
                style={{ background: view === "products" ? "#F5C842" : "transparent", color: view === "products" ? "#0D0D0F" : "#9090A8" }}
              >
                <Package size={14} className="inline mr-1" /> Products
              </button>
              <button
                onClick={() => setView("combos")}
                className="px-3 py-2 text-xs font-medium transition-colors"
                style={{ background: view === "combos" ? "#F5C842" : "transparent", color: view === "combos" ? "#0D0D0F" : "#9090A8" }}
              >
                <Tag size={14} className="inline mr-1" /> Combos
              </button>
            </div>
            <button onClick={() => fetchProducts()} className="btn-ghost py-2 px-3"><RefreshCw size={14} className={isLoading ? "spin" : ""} /></button>
            {view === "products" && (
              <button className="btn-accent flex items-center gap-2 text-sm" onClick={() => setEditing({ ...EMPTY_PRODUCT, store_id: activeStoreId })}>
                <Plus size={15} /> Add Product
              </button>
            )}
            {view === "combos" && (
              <button className="btn-accent flex items-center gap-2 text-sm" onClick={() => { setEditingCombo({ ...EMPTY_COMBO, store_id: activeStoreId }); setComboItems([]); }}>
                <Plus size={15} /> Create Combo
              </button>
            )}
          </div>
        </div>

        {view === "products" && (
          <>
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
                          <div className="flex items-center gap-3">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" style={{ background: "#1E1E26" }} />
                            ) : (
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#1E1E26" }}>
                                <Package size={18} style={{ color: "#4A4A5A" }} />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{p.name}</div>
                              {p.barcode && <div className="text-xs font-mono" style={{ color: "#4A4A5A" }}>#{p.barcode}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1A1A22", color: "#9090A8" }}>{p.category}</span></td>
                        <td className="text-right font-semibold" style={{ color: "#F5C842" }}>{curr}{p.price.toFixed(2)}</td>
                        <td className="text-right" style={{ color: "#9090A8" }}>{p.tax}%</td>
                        <td className="text-right">
                          <span style={{ color: p.stock > 10 ? "#2ECC71" : p.stock > 0 ? "#F5C842" : "#E74C3C", fontWeight: 600 }}>{p.stock}</span>
                        </td>
                        <td className="text-right pr-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditing({ ...p })}
                              className="p-1.5 rounded-lg"
                              style={{ color: "#9090A8" }}
                              title="Edit product"
                              aria-label="Edit product"
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#F5C842")} onMouseLeave={(e) => (e.currentTarget.style.color = "#9090A8")}>
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 rounded-lg"
                              style={{ color: "#9090A8" }}
                              title="Delete product"
                              aria-label="Delete product"
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
          </>
        )}

        {view === "combos" && (
          <>
            <div className="flex-1 overflow-y-auto">
              {combos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full" style={{ color: "#4A4A5A" }}>
                  <Tag size={48} className="mb-4 opacity-50" />
                  <p className="text-base mb-2">No Combos Yet</p>
                  <p className="text-sm">Create combo deals to boost sales</p>
                  <button onClick={() => { setEditingCombo({ ...EMPTY_COMBO, store_id: activeStoreId }); setComboItems([]); }} className="btn-accent mt-4">
                    <Plus size={15} className="inline mr-2" /> Create Combo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {combos.map((combo) => (
                    <div key={combo.id} className="card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "#F5C842" }}>
                            <Tag size={24} color="#0D0D0F" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{combo.name}</h3>
                            <p className="text-xs" style={{ color: "#9090A8" }}>{combo.description || "No description"}</p>
                          </div>
                        </div>
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ background: combo.is_active ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)", color: combo.is_active ? "#2ECC71" : "#E74C3C" }}
                        >
                          {combo.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        {combo.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm" style={{ color: "#9090A8" }}>
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>{curr}{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        {combo.items.length > 3 && (
                          <div className="text-xs" style={{ color: "#4A4A5A" }}>+{combo.items.length - 3} more items</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#1E1E26" }}>
                        <div>
                          <div className="text-xs line-through" style={{ color: "#4A4A5A" }}>
                            {curr}{((combo.items.reduce((s, i) => s + i.price * i.quantity, 0) + combo.discount_amount)).toFixed(2)}
                          </div>
                          <div className="font-bold text-base" style={{ color: "#2ECC71" }}>{curr}{combo.combo_price.toFixed(2)}</div>
                          {combo.discount_percent > 0 && (
                            <span className="text-xs px-1 rounded" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                              {combo.discount_percent.toFixed(0)}% OFF
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleCombo(combo.id, combo.is_active)} className="btn-ghost py-1 px-2 text-xs">
                            {combo.is_active ? "Pause" : "Activate"}
                          </button>
                          <button onClick={() => { setEditingCombo(combo); setComboItems(combo.items); }} className="p-1.5 rounded-lg" style={{ color: "#9090A8" }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteCombo(combo.id)} className="p-1.5 rounded-lg" style={{ color: "#9090A8" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Product Edit Panel */}
      {editing && (
        <div className="border-l border-border p-5 overflow-y-auto slide-in" style={{ width: 360 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold">{editing.id ? "Edit" : "Add"} Product</h2>
            <button onClick={() => { setEditing(null); setErrors({}); }} style={{ color: "#4A4A5A" }}><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Name *</label>
              <input name="name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Product name" />
              {errors.name && <p className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.name}</p>}
            </div>
            
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Image URL</label>
              <div className="flex gap-2">
                <input 
                  name="image_url"
                  value={editing.image_url || ""} 
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} 
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                />
              </div>
              {editing.image_url && (
                <div className="mt-2">
                  <img src={editing.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" style={{ background: "#1E1E26" }} />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Category</label>
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Price ({curr})</label>
                <input name="price" type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} min={0} />
                {errors.price && <p className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.price}</p>}
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Tax %</label>
                <input name="tax" type="number" value={editing.tax} onChange={(e) => setEditing({ ...editing, tax: parseFloat(e.target.value) || 0 })} min={0} max={100} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Stock</label>
                <input name="stock" type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: parseInt(e.target.value) || 0 })} min={0} />
                {errors.stock && <p className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.stock}</p>}
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Barcode</label>
                <input name="barcode" value={editing.barcode || ""} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            {/* Industry Specific Metadata */}
            <div className="pt-4 border-t border-[#1E1E26] space-y-4">
               <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A4A5A]">Industry Specific Info</h3>

               {activeStore?.industry === 'salon_spa' && (
                 <div>
                   <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}><Clock size={12} className="inline mr-1" /> Duration (minutes)</label>
                   <input
                     type="number"
                     value={editing.metadata?.duration || ""}
                     onChange={(e) => setEditing({ ...editing, metadata: { ...editing.metadata, duration: parseInt(e.target.value) || 0 } })}
                     placeholder="e.g., 45"
                   />
                 </div>
               )}

               {(activeStore?.industry === 'retail' || activeStore?.industry === 'repair_shop') && (
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input
                     type="checkbox"
                     checked={editing.metadata?.track_serial || false}
                     onChange={(e) => setEditing({ ...editing, metadata: { ...editing.metadata, track_serial: e.target.checked } })}
                     className="w-4 h-4 rounded"
                   />
                   <span className="text-sm"><ShieldCheck size={12} className="inline mr-1" /> Track IMEI / Serial Number</span>
                 </label>
               )}

               {activeStore?.industry === 'pharmacy' && (
                 <div>
                   <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}><Calendar size={12} className="inline mr-1" /> Default Expiry Months</label>
                   <input
                     type="number"
                     value={editing.metadata?.expiry_months || ""}
                     onChange={(e) => setEditing({ ...editing, metadata: { ...editing.metadata, expiry_months: parseInt(e.target.value) || 0 } })}
                     placeholder="e.g., 24"
                   />
                 </div>
               )}
            </div>

            <div className="flex gap-2 pt-4">
              <button className="btn-accent flex-1 flex items-center justify-center gap-2 py-2.5 text-sm" onClick={handleSave}>
                <Check size={15} /> Save
              </button>
              <button className="btn-ghost py-2.5 px-4 text-sm" onClick={() => { setEditing(null); setErrors({}); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Combo Edit Panel */}
      {editingCombo && (
        <div className="border-l border-border p-5 overflow-y-auto slide-in" style={{ width: 420 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold">{editingCombo.id ? "Edit" : "Create"} Combo</h2>
            <button onClick={() => { setEditingCombo(null); setComboItems([]); }} style={{ color: "#4A4A5A" }}><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Combo Name *</label>
              <input value={editingCombo.name} onChange={(e) => setEditingCombo({ ...editingCombo, name: e.target.value })} placeholder="e.g., Lunch Special" />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Description</label>
              <input value={editingCombo.description || ""} onChange={(e) => setEditingCombo({ ...editingCombo, description: e.target.value })} placeholder="Optional description" />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Combo Price ({curr})</label>
              <input 
                type="number" 
                value={editingCombo.combo_price} 
                onChange={(e) => setEditingCombo({ ...editingCombo, combo_price: parseFloat(e.target.value) || 0 })} 
                min={0} 
              />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Active</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editingCombo.is_active}
                  onChange={(e) => setEditingCombo({ ...editingCombo, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Combo is active</span>
              </label>
            </div>

            {/* Selected Items */}
            <div>
              <label className="text-xs mb-2 block" style={{ color: "#4A4A5A" }}>Combo Items ({comboItems.length})</label>
              {comboItems.length === 0 ? (
                <div className="p-4 rounded-lg text-center" style={{ background: "#1E1E26", color: "#4A4A5A" }}>
                  <Package size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click products on the right to add</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comboItems.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "#1E1E26" }}>
                      <GripVertical size={14} style={{ color: "#4A4A5A" }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.product_name}</div>
                        <div className="text-xs" style={{ color: "#9090A8" }}>{curr}{item.price} each</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateComboItemQty(item.product_id, item.quantity - 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#2A2A32" }}>-</button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button onClick={() => updateComboItemQty(item.product_id, item.quantity + 1)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#2A2A32" }}>+</button>
                      </div>
                      <button onClick={() => removeItemFromCombo(item.product_id)} style={{ color: "#E74C3C" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Summary */}
            {comboItems.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: "#1E1E26" }}>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: "#9090A8" }}>Total Items Price:</span>
                  <span>{curr}{calculateComboPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: "#9090A8" }}>Combo Price:</span>
                  <span style={{ color: "#F5C842" }}>{curr}{editingCombo.combo_price.toFixed(2)}</span>
                </div>
                {calculateComboPrice() > editingCombo.combo_price && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#2ECC71" }}>Savings:</span>
                    <span style={{ color: "#2ECC71" }}>{curr}{(calculateComboPrice() - editingCombo.combo_price).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Add Products to Combo */}
            <div>
              <label className="text-xs mb-2 block" style={{ color: "#4A4A5A" }}>Add Products to Combo</label>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {products.filter(p => !p.is_combo).slice(0, 15).map((product) => {
                  const inCombo = comboItems.some(item => item.product_id === product.id);
                  return (
                    <div 
                      key={product.id}
                      onClick={() => !inCombo && addItemToCombo(product)}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                      style={{ background: inCombo ? "#2A2A32" : "#141418" }}
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "#1E1E26" }}>
                          <Package size={14} style={{ color: "#4A4A5A" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{product.name}</div>
                        <div className="text-xs" style={{ color: "#9090A8" }}>{curr}{product.price.toFixed(2)}</div>
                      </div>
                      {inCombo ? (
                        <Check size={16} style={{ color: "#2ECC71" }} />
                      ) : (
                        <Plus size={16} style={{ color: "#4A4A5A" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button className="btn-accent flex-1 flex items-center justify-center gap-2 py-2.5 text-sm" onClick={handleSaveCombo}>
                <Check size={15} /> Save Combo
              </button>
              <button className="btn-ghost py-2.5 px-4 text-sm" onClick={() => { setEditingCombo(null); setComboItems([]); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
