"use client";
import { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Store as StoreIcon,
  ChefHat,
  ShoppingBag,
  Pill,
  Gift,
  Scissors,
  Wrench,
  Activity,
  ArrowRightLeft,
  Package
} from "lucide-react";
import { useStoresStore, useSettingsStore, useProductsStore } from "@/lib/stores";
import { Store, dbTransferStock } from "@/lib/db";

const industryIcons: Record<string, any> = {
  food: ChefHat,
  retail: ShoppingBag,
  pharmacy: Pill,
  gift_shop: Gift,
  salon_spa: Scissors,
  repair_shop: Wrench,
};

const industries = [
  { id: "food", label: "Food & Beverage" },
  { id: "retail", label: "Retail" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "gift_shop", label: "Gift Shop" },
  { id: "salon_spa", label: "Salon & Spa" },
  { id: "repair_shop", label: "Repair Shop" },
];

export default function StoresScreen() {
  const { stores, fetchStores, addStore, updateStore, deleteStore, isLoading } = useStoresStore();
  const { activeStoreId } = useSettingsStore();
  const { products, fetchProducts } = useProductsStore();
  const [isAdding, setIsAdding] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    industry: "food" as Store["industry"],
    is_active: true
  });

  const [transferData, setTransferData] = useState({
    productId: "",
    fromStoreId: activeStoreId,
    toStoreId: "",
    quantity: 1
  });

  useEffect(() => {
    fetchStores();
    fetchProducts();
  }, [fetchStores, activeStoreId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const storeData: Store = {
      id: editingStore?.id || Math.random().toString(36).substr(2, 9),
      name: formData.name,
      industry: formData.industry,
      is_active: formData.is_active,
      created_at: editingStore?.created_at || new Date().toISOString(),
    };

    if (editingStore) {
      await updateStore(storeData);
    } else {
      await addStore(storeData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: "", industry: "food", is_active: true });
    setIsAdding(false);
    setIsTransferring(false);
    setEditingStore(null);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.productId || !transferData.fromStoreId || !transferData.toStoreId) {
      alert("Please fill all fields");
      return;
    }
    try {
      await dbTransferStock(
        transferData.productId,
        transferData.fromStoreId,
        transferData.toStoreId,
        transferData.quantity
      );
      alert("Stock transferred successfully!");
      resetForm();
      fetchProducts();
    } catch (err) {
      alert("Transfer failed: " + err);
    }
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      industry: store.industry,
      is_active: store.is_active
    });
    setIsAdding(true);
  };

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-bg">
      <header className="p-6 border-b border-border bg-surface flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-[#F5C842]" />
            Store Management
          </h1>
          <p className="text-muted-foreground">Manage your business locations and industries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsTransferring(true)}
            className="flex items-center gap-2 bg-surface border border-border text-foreground px-4 py-2 rounded-xl font-bold transition-all hover:bg-muted active:scale-95"
          >
            <ArrowRightLeft size={20} />
            Transfer Stock
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[#F5C842] text-[#0D0D0F] px-4 py-2 rounded-xl font-bold transition-all hover:opacity-90 active:scale-95"
          >
            <Plus size={20} />
            Add New Store
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C842]/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map((store) => {
              const Icon = industryIcons[store.industry] || Building2;
              return (
                <div
                  key={store.id}
                  className="bg-surface border border-border rounded-2xl p-5 transition-all hover:border-[#F5C842]/50 group relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F5C842]/10 flex items-center justify-center text-[#F5C842]">
                      <Icon size={24} />
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(store)}
                        className="p-2 rounded-lg bg-muted text-foreground hover:bg-[#F5C842]/20 hover:text-[#F5C842]"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteStore(store.id)}
                        className="p-2 rounded-lg bg-muted text-foreground hover:bg-red-500/20 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold mb-1 truncate">{store.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span className="capitalize">{store.industry.replace('_', ' ')}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span>ID: {store.id}</span>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full ${
                      store.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      <Activity size={12} />
                      {store.is_active ? 'Active' : 'Inactive'}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Added {new Date(store.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStores.length === 0 && !isLoading && (
            <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border">
              <Building2 className="mx-auto text-muted-foreground mb-4 opacity-20" size={64} />
              <h3 className="text-xl font-bold mb-2">No stores found</h3>
              <p className="text-muted-foreground mb-6">Start by adding your first business location</p>
              <button
                onClick={() => setIsAdding(true)}
                className="bg-[#F5C842] text-[#0D0D0F] px-6 py-2 rounded-xl font-bold"
              >
                Add Store
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal Overlay */}
      {isTransferring && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <header className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-[#F5C842]" />
                Transfer Stock
              </h2>
              <button onClick={resetForm} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground ml-1">Select Product</label>
                <select
                  required
                  value={transferData.productId}
                  onChange={(e) => setTransferData({ ...transferData, productId: e.target.value })}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                >
                  <option value="">Choose a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-muted-foreground ml-1">From Store</label>
                  <select
                    required
                    value={transferData.fromStoreId}
                    onChange={(e) => setTransferData({ ...transferData, fromStoreId: e.target.value })}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-muted-foreground ml-1">To Store</label>
                  <select
                    required
                    value={transferData.toStoreId}
                    onChange={(e) => setTransferData({ ...transferData, toStoreId: e.target.value })}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                  >
                    <option value="">Select Target...</option>
                    {stores.filter(s => s.id !== transferData.fromStoreId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground ml-1">Quantity to Move</label>
                <div className="flex items-center gap-3 p-1 bg-muted border border-border rounded-xl">
                   <input
                    required
                    type="number"
                    min="1"
                    value={transferData.quantity}
                    onChange={(e) => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 0 })}
                    className="flex-1 p-2 bg-transparent focus:outline-none font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#F5C842] text-[#0D0D0F] rounded-xl font-bold transition-all hover:opacity-90 active:scale-95"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <header className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingStore ? <Edit2 size={20} /> : <Plus size={20} />}
                {editingStore ? 'Edit Store' : 'New Store'}
              </h2>
              <button onClick={resetForm} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground ml-1">Store Name</label>
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="e.g. Downtown Cafe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground ml-1">Industry Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {industries.map((ind) => {
                    const Icon = industryIcons[ind.id];
                    return (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, industry: ind.id as any })}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                          formData.industry === ind.id
                            ? 'border-[#F5C842] bg-[#F5C842]/10'
                            : 'border-transparent bg-muted hover:border-border'
                        }`}
                      >
                        <Icon size={18} className={formData.industry === ind.id ? 'text-[#F5C842]' : 'text-muted-foreground'} />
                        <span className="text-xs font-bold leading-tight">{ind.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 accent-[#F5C842]"
                />
                <label htmlFor="is_active" className="text-sm font-bold cursor-pointer">Store is active</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#F5C842] text-[#0D0D0F] rounded-xl font-bold transition-all hover:opacity-90 active:scale-95"
                >
                  {editingStore ? 'Save Changes' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
