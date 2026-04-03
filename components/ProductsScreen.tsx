"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Search, RefreshCw, Package, Image, Tag, Star, GripVertical, Clock, ShieldCheck, Calendar, Download, Upload, Filter, ChevronRight, Barcode, Hash, FileText, Activity } from "lucide-react";
import { dbSaveProduct, dbDeleteProduct, Product, dbGetCombos, dbSaveCombo, dbDeleteCombo, dbToggleCombo, Combo, ComboItem, ProductVariant } from "@/lib/db";
import { useProductsStore, useSettingsStore, useStoresStore } from "@/lib/stores";
import { useRef } from "react";
import { v4 as uuid } from "uuid";

const EMPTY_PRODUCT: Product = {
  id: "",
  store_id: "",
  name: "",
  price: 0,
  cost_price: 0,
  wholesale_price: 0,
  category: "Food",
  subcategory: "",
  stock: 0,
  barcode: "",
  sku: "",
  description: "",
  tax: 18,
  status: "active",
  tags: "",
  is_digital: false,
  is_favorite: false,
  image_url: ""
};
const CATEGORIES = ["Beverages", "Food", "Snacks", "Bakery", "Electronics", "Medicines", "Clothing", "Other"];
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
  const {
    products, isLoading, fetchProducts, addProduct, updateProduct, deleteProduct,
    exportProducts, importProducts, fetchVariants, saveVariant, deleteVariant,
    categories, subcategories, selectedCategory, setSelectedCategory,
    selectedSubcategory, setSelectedSubcategory, sortBy, sortOrder, setSorting
  } = useProductsStore();
  const { settings, fetchSettings } = useSettingsStore();

  const activeStore = stores.find(s => s.id === activeStoreId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [view, setView] = useState<"products" | "combos">("products");
  const [combos, setCombos] = useState<Combo[]>([]);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [editingVariants, setEditingVariants] = useState<ProductVariant[]>([]);
  const [variantsToDelete, setVariantsToDelete] = useState<string[]>([]);
  const initialVariantIds = useRef<Set<string>>(new Set());
  const [customAttributes, setCustomAttributes] = useState<{ key: string, value: string }[]>([]);

  useEffect(() => { 
    fetchProducts(); 
    fetchSettings();
    fetchCombos();
  }, [activeStoreId]);

  useEffect(() => {
    if (editing) {
      if (editing.id) {
        fetchVariants(editing.id).then(variants => {
          setEditingVariants(variants);
          initialVariantIds.current = new Set(variants.map(v => v.id));
        });
      } else {
        setEditingVariants([]);
        initialVariantIds.current = new Set();
      }

      // Load custom attributes from metadata
      const attrs = Object.entries(editing.metadata || {})
        .filter(([key]) => !['duration', 'track_serial', 'expiry_months', 'variant_id', 'serial_number'].includes(key))
        .map(([key, value]) => ({ key, value: String(value) }));
      setCustomAttributes(attrs);
    }
  }, [editing?.id]);

  const fetchCombos = async () => {
    try {
      const data = await dbGetCombos(activeStoreId);
      setCombos(data);
    } catch (err) {
      console.error("Failed to fetch combos:", err);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || p.subcategory === selectedSubcategory;

    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    // Favorites always first
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;

    let comparison = 0;
    if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
    else if (sortBy === 'price') comparison = a.price - b.price;
    else if (sortBy === 'stock') comparison = a.stock - b.stock;
    else if (sortBy === 'category') comparison = a.category.localeCompare(b.category);

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const displayedProducts = sorted.slice(0, displayLimit);
  const hasMore = displayLimit < sorted.length;

  useEffect(() => { setDisplayLimit(ITEMS_PER_PAGE); }, [search]);

  const handleSave = async () => {
    if (!editing || !editing.name) return;
    const errors = validateProduct(editing);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }
    try {
      const productId = editing.id || uuid();

      // Merge custom attributes back into metadata
      const newMetadata = { ...editing.metadata };
      customAttributes.forEach(attr => {
        if (attr.key.trim()) {
          newMetadata[attr.key.trim()] = attr.value;
        }
      });
      // Remove keys that are now empty in custom attributes but existed before
      const currentAttrKeys = customAttributes.map(a => a.key.trim());
      Object.keys(newMetadata).forEach(key => {
        if (!['duration', 'track_serial', 'expiry_months', 'variant_id', 'serial_number'].includes(key) && !currentAttrKeys.includes(key)) {
          delete newMetadata[key];
        }
      });

      const product = { ...editing, id: productId, store_id: activeStoreId, metadata: newMetadata };
      if (editing.id) {
        await updateProduct(product);
      } else {
        await addProduct(product);
      }

      // Delete staged variants
      for (const variantId of variantsToDelete) {
        await deleteVariant(variantId);
      }

      // Save variants
      for (const variant of editingVariants) {
        await saveVariant({ ...variant, product_id: productId, store_id: activeStoreId });
      }

      setEditing(null);
      setErrors({});
      setEditingVariants([]);
      setVariantsToDelete([]);
      initialVariantIds.current = new Set();
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

    try {
      await dbSaveCombo(combo, activeStoreId);
      await fetchCombos();
      setEditingCombo(null);
      setComboItems([]);
    } catch (err) {
      console.error("Failed to save combo:", err);
      alert("Failed to save combo. Please try again.");
    }
  };

  const handleDeleteCombo = async (id: string) => {
    if (!confirm("Delete this combo?")) return;
    try {
      await dbDeleteCombo(id, activeStoreId);
      await fetchCombos();
    } catch (err) {
      console.error("Failed to delete combo:", err);
      alert("Failed to delete combo. Please try again.");
    }
  };

  const handleToggleCombo = async (id: string, currentActive: boolean) => {
    try {
      await dbToggleCombo(id, !currentActive, activeStoreId);
      await fetchCombos();
    } catch (err) {
      console.error("Failed to toggle combo:", err);
      alert("Failed to toggle combo. Please try again.");
    }
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

  const handleExport = async () => {
    try {
      const csv = await exportProducts();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${activeStoreId}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export products:", err);
      alert("Failed to export products");
    }
  };

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: uuid(),
      product_id: editing?.id || "",
      store_id: activeStoreId,
      name: "",
      value: "",
      sku: "",
      price: editing?.price || 0,
      stock: 0,
    };
    setEditingVariants([...editingVariants, newVariant]);
  };

  const handleRemoveVariant = (id: string) => {
    setEditingVariants(editingVariants.filter(v => v.id !== id));
    if (initialVariantIds.current.has(id)) {
      setVariantsToDelete([...variantsToDelete, id]);
    }
  };

  const handleUpdateVariant = (id: string, updates: Partial<ProductVariant>) => {
    setEditingVariants(editingVariants.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const generateSKU = (name: string, category: string) => {
    const prefix = category.substring(0, 3).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  };

  const generateBarcode = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  };

  const toggleFavorite = async (product: Product) => {
    try {
      await updateProduct({ ...product, is_favorite: !product.is_favorite });
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target?.result as string;
      try {
        const result = await importProducts(csvData);
        alert(`Import complete! Imported: ${result.imported}, Errors: ${result.errors}`);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        console.error("Failed to import products:", err);
        alert("Failed to import products. Please check the CSV format.");
      }
    };
    reader.readAsText(file);
  };

  const curr = settings?.currency_symbol ?? "₹";

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
           <h1 className="font-display text-xl font-bold">Products</h1>
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
            <button onClick={() => fetchProducts()} className="btn-ghost py-2 px-3" title="Refresh"><RefreshCw size={14} className={isLoading ? "spin" : ""} /></button>

            {view === "products" && (
              <>
                <button onClick={handleExport} className="btn-ghost py-2 px-3" title="Export CSV">
                  <Download size={14} />
                </button>
                <button onClick={handleImportClick} className="btn-ghost py-2 px-3" title="Import CSV">
                  <Upload size={14} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <button className="btn-accent flex items-center gap-2 text-sm" onClick={() => setEditing({ ...EMPTY_PRODUCT, store_id: activeStoreId })}>
                  <Plus size={15} /> Add Product
                </button>
              </>
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
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} />
                <input placeholder="Search products, SKU or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 px-3 rounded-lg border border-border bg-[#141418]">
                  <Filter size={12} className="text-[#4A4A5A]" />
                  <select
                    className="bg-transparent border-none text-xs focus:ring-0 min-w-[100px]"
                    value={selectedCategory || ""}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {selectedCategory && (
                  <div className="flex items-center gap-1 px-3 rounded-lg border border-border bg-[#141418] animate-in fade-in slide-in-from-left-2">
                    <ChevronRight size={12} className="text-[#4A4A5A]" />
                    <select
                      className="bg-transparent border-none text-xs focus:ring-0 min-w-[100px]"
                      value={selectedSubcategory || ""}
                      onChange={(e) => setSelectedSubcategory(e.target.value || null)}
                    >
                      <option value="">All Subcategories</option>
                      {subcategories.filter(s => products.some(p => p.category === selectedCategory && p.subcategory === s)).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full" style={{ color: "#4A4A5A" }}><RefreshCw size={24} className="spin" /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: "#0D0D0F" }}>
                    <tr style={{ color: "#4A4A5A", fontSize: 11 }}>
                      <th scope="col" className="text-left pb-3 pl-3 cursor-pointer" onClick={() => setSorting('name', sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                        PRODUCT {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="text-left pb-3 cursor-pointer" onClick={() => setSorting('category', sortBy === 'category' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                        CATEGORY {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="text-right pb-3 cursor-pointer" onClick={() => setSorting('price', sortBy === 'price' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                        PRICE {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="text-right pb-3">TAX</th>
                      <th scope="col" className="text-right pb-3 cursor-pointer" onClick={() => setSorting('stock', sortBy === 'stock' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                        STOCK {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="text-right pb-3 pr-3">ACTIONS</th>
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
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{p.name}</div>
                                {p.is_favorite && <Star size={12} fill="#F5C842" color="#F5C842" />}
                                {p.is_digital && <div className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30">DIGITAL</div>}
                                {p.status !== 'active' && <div className="px-1.5 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30 uppercase">{p.status}</div>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {p.barcode && <div className="text-[10px] font-mono" style={{ color: "#4A4A5A" }}>#{p.barcode}</div>}
                                {p.sku && <div className="text-[10px] font-mono px-1 rounded bg-[#1A1A22]" style={{ color: "#9090A8" }}>{p.sku}</div>}
                              </div>
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
                              onClick={() => toggleFavorite(p)}
                              className="p-1.5 rounded-lg"
                              style={{ color: p.is_favorite ? "#F5C842" : "#4A4A5A" }}
                              title="Toggle favorite"
                            >
                              <Star size={14} fill={p.is_favorite ? "#F5C842" : "none"} />
                            </button>
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
                            {curr}{(combo.items.reduce((s, i) => s + i.price * i.quantity, 0)).toFixed(2)}
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
            <button onClick={() => { setEditing(null); setErrors({}); setVariantsToDelete([]); initialVariantIds.current = new Set(); }} style={{ color: "#4A4A5A" }}><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Name *</label>
              <input name="name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Product name" />
              {errors.name && <p className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.name}</p>}
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Description</label>
              <textarea
                className="w-full p-2 rounded-lg text-sm"
                rows={3}
                style={{ background: "#1E1E26", color: "white", border: "1px solid #2A2A32" }}
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Product description..."
              />
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
                <div className="mt-2 relative">
                  <img src={editing.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" style={{ background: "#1E1E26" }} />
                  <button onClick={() => setEditing({ ...editing, image_url: "" })} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"><X size={14} /></button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Category</label>
                <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Subcategory</label>
                <input value={editing.subcategory || ""} onChange={(e) => setEditing({ ...editing, subcategory: e.target.value })} placeholder="e.g., Hot Drinks" />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Selling ({curr}) *</label>
                <input name="price" type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} min={0} />
                {errors.price && <p className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.price}</p>}
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Cost ({curr})</label>
                <input type="number" value={editing.cost_price} onChange={(e) => setEditing({ ...editing, cost_price: parseFloat(e.target.value) || 0 })} min={0} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Wholesale ({curr})</label>
                <input type="number" value={editing.wholesale_price} onChange={(e) => setEditing({ ...editing, wholesale_price: parseFloat(e.target.value) || 0 })} min={0} />
              </div>
            </div>

            {(editing.price > 0 && editing.cost_price > 0) && (
              <div className="flex gap-4 p-2 rounded-lg bg-[#141418] border border-[#1E1E26]">
                <div className="flex-1">
                  <div className="text-[10px] text-[#4A4A5A] uppercase font-bold">Margin %</div>
                  <div className="text-sm font-bold text-[#2ECC71]">
                    {(((editing.price - editing.cost_price) / editing.price) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="flex-1 border-l border-[#1E1E26] pl-4">
                  <div className="text-[10px] text-[#4A4A5A] uppercase font-bold">Profit</div>
                  <div className="text-sm font-bold text-[#2ECC71]">
                    {curr}{(editing.price - editing.cost_price).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Stock</label>
                <input name="stock" type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: parseInt(e.target.value) || 0 })} min={0} />
                {errors.stock && <p className="text-xs mt-1" style={{ color: "#E74C3C" }}>{errors.stock}</p>}
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Tax %</label>
                <input name="tax" type="number" value={editing.tax} onChange={(e) => setEditing({ ...editing, tax: parseFloat(e.target.value) || 0 })} min={0} max={100} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>SKU</label>
                <div className="flex gap-1">
                  <input className="flex-1" value={editing.sku || ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="Auto" />
                  <button onClick={() => setEditing({ ...editing, sku: generateSKU(editing.name, editing.category) })} className="p-2 bg-[#1E1E26] rounded-lg" title="Generate SKU"><Hash size={14} /></button>
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Barcode</label>
                <div className="flex gap-1">
                  <input className="flex-1" value={editing.barcode || ""} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} placeholder="Auto" />
                  <button onClick={() => setEditing({ ...editing, barcode: generateBarcode() })} className="p-2 bg-[#1E1E26] rounded-lg" title="Generate Barcode"><Barcode size={14} /></button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Tags (comma separated)</label>
                <input value={editing.tags || ""} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} placeholder="tag1, tag2" />
              </div>
            </div>

            <div className="flex items-center gap-6 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_digital}
                  onChange={(e) => setEditing({ ...editing, is_digital: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Digital Product</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_favorite}
                  onChange={(e) => setEditing({ ...editing, is_favorite: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Pin to Favorites</span>
              </label>
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

            {/* Custom Attributes Section */}
            <div className="pt-4 border-t border-[#1E1E26] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A4A5A]">Custom Attributes</h3>
                <button
                  onClick={() => setCustomAttributes([...customAttributes, { key: "", value: "" }])}
                  className="text-[10px] px-2 py-1 bg-[#1E1E26] rounded text-[#F5C842] hover:bg-[#2A2A32]"
                >
                  <Plus size={10} className="inline mr-1" /> Add Field
                </button>
              </div>

              {customAttributes.length === 0 ? (
                <p className="text-[10px] text-center py-2 text-[#4A4A5A] italic">No custom fields added</p>
              ) : (
                <div className="space-y-2">
                  {customAttributes.map((attr, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        className="text-[10px] p-1.5 flex-1"
                        placeholder="Key (e.g., Brand)"
                        value={attr.key}
                        onChange={(e) => {
                          const newAttrs = [...customAttributes];
                          newAttrs[idx].key = e.target.value;
                          setCustomAttributes(newAttrs);
                        }}
                      />
                      <input
                        className="text-[10px] p-1.5 flex-1"
                        placeholder="Value"
                        value={attr.value}
                        onChange={(e) => {
                          const newAttrs = [...customAttributes];
                          newAttrs[idx].value = e.target.value;
                          setCustomAttributes(newAttrs);
                        }}
                      />
                      <button onClick={() => setCustomAttributes(customAttributes.filter((_, i) => i !== idx))} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Variants Section */}
            <div className="pt-4 border-t border-[#1E1E26] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A4A5A]"><Activity size={12} className="inline mr-1" /> Product Variants</h3>
                <button onClick={handleAddVariant} className="text-[10px] px-2 py-1 bg-[#1E1E26] rounded text-[#F5C842] hover:bg-[#2A2A32]">
                  <Plus size={10} className="inline mr-1" /> Add Variant
                </button>
              </div>

              {editingVariants.length === 0 ? (
                <p className="text-[10px] text-center py-4 text-[#4A4A5A] italic">No variants defined for this product</p>
              ) : (
                <div className="space-y-2">
                  {editingVariants.map((v) => (
                    <div key={v.id} className="p-2 rounded-lg bg-[#141418] border border-[#1E1E26] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="text-[10px] p-1.5"
                          placeholder="Name (e.g., Color)"
                          value={v.name}
                          onChange={(e) => handleUpdateVariant(v.id, { name: e.target.value })}
                        />
                        <input
                          className="text-[10px] p-1.5"
                          placeholder="Value (e.g., Red)"
                          value={v.value}
                          onChange={(e) => handleUpdateVariant(v.id, { value: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-[#4A4A5A] pl-1">{curr}</span>
                          <input
                            type="number"
                            className="text-[10px] p-1.5 pl-4"
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) => handleUpdateVariant(v.id, { price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <input
                          type="number"
                          className="text-[10px] p-1.5"
                          placeholder="Stock"
                          value={v.stock}
                          onChange={(e) => handleUpdateVariant(v.id, { stock: parseInt(e.target.value) || 0 })}
                        />
                        <div className="flex gap-1">
                          <input
                            className="text-[10px] p-1.5 flex-1"
                            placeholder="SKU"
                            value={v.sku}
                            onChange={(e) => handleUpdateVariant(v.id, { sku: e.target.value })}
                          />
                          <button onClick={() => handleRemoveVariant(v.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"><X size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button className="btn-accent flex-1 flex items-center justify-center gap-2 py-2.5 text-sm" onClick={handleSave}>
                <Check size={15} /> Save
              </button>
              <button className="btn-ghost py-2.5 px-4 text-sm" onClick={() => { setEditing(null); setErrors({}); setVariantsToDelete([]); initialVariantIds.current = new Set(); }}>Cancel</button>
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
