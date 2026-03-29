"use client";

import { useState, useEffect } from "react";
import {
  Package,
  ArrowRightLeft,
  History,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  Plus,
  Minus,
  Search,
  Filter,
  RefreshCw,
  Box,
  LayoutDashboard,
  Layers,
  ShieldCheck,
  Hash,
  X,
  Calendar
} from "lucide-react";
import {
  dbGetProducts,
  dbGetStores,
  dbAdjustStockWithReason,
  dbTransferStock,
  dbGetInventoryValuation,
  dbGetInventoryHistory,
  dbGetStockCounts,
  dbSaveStockCount,
  dbGetBatches,
  dbGetSerialNumbers,
  dbSaveBatch,
  dbSaveSerialNumber,
  Product,
  Store,
  InventoryTransaction,
  StockCount,
  StockCountItem,
  Batch,
  SerialNumber
} from "@/lib/db";
import { useSettingsStore, useProductsStore, useAuthStore } from "@/lib/stores";
import { v4 as uuid } from "uuid";

type TabType = "overview" | "adjust" | "transfer" | "history" | "reconcile" | "batch_serial" | "reports";

export default function InventoryManagementScreen() {
  const { activeStoreId, settings } = useSettingsStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [valuation, setValuation] = useState(0);
  const [valuationMethod, setValuationMethod] = useState<'average' | 'fifo'>('average');
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const curr = settings?.currency_symbol ?? "₹";

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [p, s, v, h] = await Promise.all([
        dbGetProducts(activeStoreId),
        dbGetStores(),
        dbGetInventoryValuation(activeStoreId, valuationMethod),
        dbGetInventoryHistory(activeStoreId)
      ]);
      setProducts(p);
      setStores(s);
      setValuation(v);
      setHistory(h);
    } catch (err) {
      console.error("Failed to load inventory data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeStoreId, valuationMethod]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display">Inventory Management</h1>
            <p className="text-xs text-muted-foreground">Real-time stock tracking, audit trails, and physical count reconciliation.</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-ghost p-2" title="Refresh">
          <RefreshCw size={18} className={isLoading ? "spin" : ""} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-56 border-r border-border p-3 space-y-1 overflow-y-auto">
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<LayoutDashboard size={18} />} label="Overview" />
          <TabButton active={activeTab === "adjust"} onClick={() => setActiveTab("adjust")} icon={<Plus size={18} />} label="Stock Adjust" />
          <TabButton active={activeTab === "transfer"} onClick={() => setActiveTab("transfer")} icon={<ArrowRightLeft size={18} />} label="Stock Transfer" />
          <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")} icon={<History size={18} />} label="Audit Trail" />
          <TabButton active={activeTab === "reconcile"} onClick={() => setActiveTab("reconcile")} icon={<CheckSquare size={18} />} label="Stock Count" />
          <TabButton active={activeTab === "batch_serial"} onClick={() => setActiveTab("batch_serial")} icon={<Layers size={18} />} label="Batch & Serial" />
          <TabButton active={activeTab === "reports"} onClick={() => setActiveTab("reports")} icon={<BarChart3 size={18} />} label="Reports" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-background/50">
          {activeTab === "overview" && <OverviewTab products={products} valuation={valuation} curr={curr} method={valuationMethod} setMethod={setValuationMethod} />}
          {activeTab === "adjust" && <AdjustTab products={products} onUpdate={loadData} userId={user?.id || "admin"} userName={user?.name || "Admin"} storeId={activeStoreId} />}
          {activeTab === "transfer" && <TransferTab products={products} stores={stores} currentStoreId={activeStoreId} onUpdate={loadData} userId={user?.id || "admin"} userName={user?.name || "Admin"} />}
          {activeTab === "history" && <HistoryTab history={history} products={products} curr={curr} />}
          {activeTab === "reconcile" && <ReconcileTab products={products} onUpdate={loadData} userId={user?.id || "admin"} storeId={activeStoreId} />}
          {activeTab === "batch_serial" && <BatchSerialTab products={products} storeId={activeStoreId} curr={curr} />}
          {activeTab === "reports" && <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><BarChart3 size={48} className="mb-4 opacity-50" /><p>Advanced inventory reports coming soon.</p></div>}
        </div>
      </div>
    </div>
  );
}

function BatchSerialTab({ products, storeId, curr }: { products: Product[], storeId: string, curr: string }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showAddSerial, setShowAddSerial] = useState(false);

  const [newBatch, setNewBatch] = useState({ number: "", qty: 0, cost: 0, expiry: "" });
  const [newSerial, setNewSerial] = useState("");

  const trackableProducts = products.filter(p => p.is_serialized || p.track_batches);

  useEffect(() => {
    if (selectedProduct) loadDetails();
  }, [selectedProduct]);

  const loadDetails = async () => {
    if (!selectedProduct) return;
    setIsLoading(true);
    try {
      const [b, s] = await Promise.all([
        dbGetBatches(storeId, selectedProduct.id),
        dbGetSerialNumbers(storeId, selectedProduct.id)
      ]);
      setBatches(b);
      setSerials(s);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBatch = async () => {
    if (!selectedProduct || !newBatch.number) return;
    try {
      await dbSaveBatch({
        id: uuid(),
        store_id: storeId,
        product_id: selectedProduct.id,
        batch_number: newBatch.number,
        quantity: newBatch.qty,
        cost_price: newBatch.cost,
        expiry_date: newBatch.expiry || null,
        created_at: new Date().toISOString()
      }, storeId);
      setShowAddBatch(false);
      setNewBatch({ number: "", qty: 0, cost: 0, expiry: "" });
      loadDetails();
    } catch (e) {
      alert("Failed to save batch");
    }
  };

  const handleAddSerial = async () => {
    if (!selectedProduct || !newSerial) return;
    try {
      await dbSaveSerialNumber({
        id: uuid(),
        store_id: storeId,
        product_id: selectedProduct.id,
        serial_number: newSerial,
        status: 'available',
        order_id: null
      });
      setShowAddSerial(false);
      setNewSerial("");
      loadDetails();
    } catch (e) {
      alert("Failed to save serial number");
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      <div className="col-span-4 flex flex-col gap-4">
        <h3 className="font-bold flex items-center gap-2"><Layers size={18} /> Trackable Products</h3>
        <div className="card flex-1 overflow-y-auto">
          {trackableProducts.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">No serialized or batch products found.</div>
          ) : (
            <div className="divide-y divide-border">
              {trackableProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`w-full text-left p-4 hover:bg-accent/5 transition-colors ${selectedProduct?.id === p.id ? 'bg-accent/10 border-l-4 border-accent' : ''}`}
                >
                   <div className="font-bold text-sm">{p.name}</div>
                   <div className="flex gap-2 mt-1">
                      {p.is_serialized && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold uppercase tracking-tighter">Serialized</span>}
                      {p.track_batches && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-bold uppercase tracking-tighter">Batches</span>}
                   </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="col-span-8 flex flex-col gap-6">
         {!selectedProduct ? (
           <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-3xl">
              <Package size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Select a product to view details</p>
           </div>
         ) : (
           <>
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
                   <p className="text-xs text-muted-foreground">Manage inventory tracking details</p>
                </div>
                <div className="flex gap-2">
                   {selectedProduct.track_batches && <button onClick={() => setShowAddBatch(true)} className="btn-accent py-2 px-4 text-xs font-bold">+ New Batch</button>}
                   {selectedProduct.is_serialized && <button onClick={() => setShowAddSerial(true)} className="btn-accent py-2 px-4 text-xs font-bold">+ New Serial</button>}
                </div>
             </div>

             {selectedProduct.track_batches && (
               <div className="space-y-3">
                 <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><Hash size={14} /> Active Batches</h4>
                 <div className="card overflow-hidden">
                    <table className="w-full text-xs">
                       <thead className="bg-muted/50 border-b border-border">
                          <tr>
                             <th className="p-3 text-left">BATCH #</th>
                             <th className="p-3 text-center">QUANTITY</th>
                             <th className="p-3 text-right">COST</th>
                             <th className="p-3 text-center">EXPIRY</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border">
                          {batches.map(b => (
                            <tr key={b.id} className="hover:bg-accent/5">
                               <td className="p-3 font-bold">{b.batch_number}</td>
                               <td className="p-3 text-center">
                                  <span className={b.quantity <= 5 ? "text-destructive font-bold" : ""}>{b.quantity}</span>
                               </td>
                               <td className="p-3 text-right">{curr}{b.cost_price.toFixed(2)}</td>
                               <td className="p-3 text-center text-muted-foreground">
                                  {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : '-'}
                               </td>
                            </tr>
                          ))}
                          {batches.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No batches tracked for this product.</td></tr>}
                       </tbody>
                    </table>
                 </div>
               </div>
             )}

             {selectedProduct.is_serialized && (
               <div className="space-y-3">
                 <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><ShieldCheck size={14} /> Serial Numbers</h4>
                 <div className="grid grid-cols-4 gap-3 overflow-y-auto max-h-[400px]">
                    {serials.map(s => (
                      <div key={s.id} className={`p-3 rounded-xl border flex flex-col gap-1 ${s.status === 'sold' ? 'opacity-50 bg-muted/20 border-border' : 'border-accent/20 bg-accent/5'}`}>
                         <span className="font-mono text-xs font-bold">{s.serial_number}</span>
                         <span className={`text-[9px] font-bold uppercase ${s.status === 'sold' ? 'text-destructive' : 'text-green-500'}`}>{s.status}</span>
                      </div>
                    ))}
                    {serials.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground card">No serial numbers found.</div>}
                 </div>
               </div>
             )}
           </>
         )}
      </div>

      {/* Add Batch Modal */}
      {showAddBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="card w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                 <h3 className="font-bold flex items-center gap-2"><Plus size={18} className="text-accent" /> Add New Batch</h3>
                 <button onClick={() => setShowAddBatch(false)}><X size={18} /></button>
              </div>
              <div className="space-y-3">
                 <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Batch Number</label>
                    <input value={newBatch.number} onChange={(e) => setNewBatch({...newBatch, number: e.target.value})} placeholder="e.g. LOT-2024-001" />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[10px] font-bold text-muted-foreground uppercase">Initial Qty</label>
                       <input type="number" value={newBatch.qty} onChange={(e) => setNewBatch({...newBatch, qty: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-muted-foreground uppercase">Unit Cost</label>
                       <input type="number" value={newBatch.cost} onChange={(e) => setNewBatch({...newBatch, cost: parseFloat(e.target.value) || 0})} />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Expiry Date</label>
                    <input type="date" value={newBatch.expiry} onChange={(e) => setNewBatch({...newBatch, expiry: e.target.value})} />
                 </div>
              </div>
              <button onClick={handleAddBatch} className="btn-accent w-full py-3 font-bold">Save Batch Information</button>
           </div>
        </div>
      )}

      {/* Add Serial Modal */}
      {showAddSerial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="card w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                 <h3 className="font-bold flex items-center gap-2"><Plus size={18} className="text-accent" /> Register Serial</h3>
                 <button onClick={() => setShowAddSerial(false)}><X size={18} /></button>
              </div>
              <div>
                 <label className="text-[10px] font-bold text-muted-foreground uppercase">Serial Number (S/N)</label>
                 <input autoFocus value={newSerial} onChange={(e) => setNewSerial(e.target.value)} placeholder="Type or scan..." />
                 <p className="text-[9px] text-muted-foreground mt-2 italic">Ensure unique serial numbers for accurate electronic tracking.</p>
              </div>
              <button onClick={handleAddSerial} className="btn-accent w-full py-3 font-bold">Save Serial Number</button>
           </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20" : "text-muted-foreground hover:bg-accent/10 hover:text-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function OverviewTab({ products, valuation, curr, method, setMethod }: { products: Product[], valuation: number, curr: string, method: 'average' | 'fifo' | 'lifo', setMethod: (m: 'average' | 'fifo' | 'lifo') => void }) {
  const [search, setSearch] = useState("");
  const lowStock = products.filter(p => p.stock <= p.reorder_level);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="relative group">
           <StatsCard label="TOTAL VALUE" value={`${curr}${valuation.toLocaleString()}`} icon={<BarChart3 className="text-accent" />} subtext={`Method: ${method.toUpperCase()}`} />
           <div className="absolute top-4 right-14 flex bg-background/80 backdrop-blur border border-border rounded-lg p-0.5 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setMethod('average')}
                className={`px-2 py-1 text-[10px] font-bold rounded ${method === 'average' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/10'}`}
              >AVG</button>
              <button
                onClick={() => setMethod('fifo')}
                className={`px-2 py-1 text-[10px] font-bold rounded ${method === 'fifo' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/10'}`}
              >FIFO</button>
              <button
                onClick={() => setMethod('lifo')}
                className={`px-2 py-1 text-[10px] font-bold rounded ${method === 'lifo' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/10'}`}
              >LIFO</button>
           </div>
        </div>
        <StatsCard label="LOW STOCK" value={`${lowStock.length} Items`} icon={<AlertTriangle className="text-destructive" />} subtext="Products at or below reorder level" color="destructive" />
        <StatsCard label="TOTAL ITEMS" value={`${products.length} Products`} icon={<Box className="text-blue-500" />} subtext="Unique products across categories" />
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold">Quick Status</h3>
          <div className="relative w-64">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <input
               className="pl-9 py-1.5 text-xs h-auto"
               placeholder="Search product, category, ID..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">PRODUCT</th>
                <th className="text-left p-3 font-medium">STOCK</th>
                <th className="text-left p-3 font-medium">REORDER</th>
                <th className="text-left p-3 font-medium">UNIT</th>
                <th className="text-right p-3 font-medium">COST</th>
                <th className="text-right p-3 font-medium">VALUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.slice(0, 15).map(p => (
                <tr key={p.id} className="hover:bg-accent/5 transition-colors">
                  <td className="p-3 font-medium">
                    {p.name}
                    <div className="text-[10px] text-muted-foreground">{p.category}</div>
                  </td>
                  <td className="p-3">
                    <span className={p.stock <= p.reorder_level ? "text-destructive font-bold" : "text-green-500"}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.reorder_level}</td>
                  <td className="p-3 text-muted-foreground">{p.unit}</td>
                  <td className="p-3 text-right">{curr}{p.cost_price.toFixed(2)}</td>
                  <td className="p-3 text-right font-bold">{curr}{(p.stock * p.cost_price).toFixed(2)}</td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-10 text-center text-muted-foreground">No products matching "{search}"</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-border text-center">
          <button className="text-xs font-bold text-accent hover:underline uppercase tracking-wider">View All Products</button>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, icon, subtext, color = "accent" }: { label: string, value: string, icon: any, subtext: string, color?: string }) {
  return (
    <div className="card p-5 relative overflow-hidden group">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">{label}</p>
          <h2 className={`text-3xl font-display font-bold ${color === "destructive" ? "text-destructive" : ""}`}>{value}</h2>
        </div>
        <div className={`p-3 rounded-xl bg-${color}/10 transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4 relative z-10">{subtext}</p>
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${color}/5 rounded-full blur-2xl group-hover:bg-${color}/10 transition-all`} />
    </div>
  );
}

function AdjustTab({ products, onUpdate, userId, userName, storeId }: { products: Product[], onUpdate: () => void, userId: string, userName: string, storeId: string }) {
  const [selectedId, setSelectedId] = useState("");
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdjust = async () => {
    if (!selectedId || delta === 0 || !reason) return;
    setIsSubmitting(true);
    try {
      await dbAdjustStockWithReason(selectedId, storeId, delta, reason, userId, userName);
      onUpdate();
      setDelta(1);
      setReason("");
      alert("Stock adjusted successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-lg mb-2">Adjust Inventory</h3>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Select Product</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full">
            <option value="">Choose a product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Current: {p.stock} {p.unit})</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Adjustment Amount</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setDelta(prev => prev - 1)} className="btn-ghost p-2 rounded-full"><Minus size={18} /></button>
            <input type="number" value={delta} onChange={(e) => setDelta(parseInt(e.target.value) || 0)} className="text-center font-bold text-lg w-24" />
            <button onClick={() => setDelta(prev => prev + 1)} className="btn-ghost p-2 rounded-full"><Plus size={18} /></button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 italic">Use negative values to decrease stock (e.g., breakage, loss)</p>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Reason for Adjustment</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Physical count correction, damaged goods..." />
        </div>

        <button
          onClick={handleAdjust}
          disabled={!selectedId || !reason || isSubmitting}
          className="btn-accent w-full py-3 flex items-center justify-center gap-2 font-bold"
        >
          {isSubmitting ? <RefreshCw className="spin" /> : <CheckSquare size={18} />}
          Update Stock Levels
        </button>
      </div>
    </div>
  );
}

function TransferTab({ products, stores, currentStoreId, onUpdate, userId, userName }: { products: Product[], stores: Store[], currentStoreId: string, onUpdate: () => void, userId: string, userName: string }) {
  const [selectedId, setSelectedId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [qty, setQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTransfer = async () => {
    if (!selectedId || !toStoreId || qty <= 0) return;
    setIsSubmitting(true);
    try {
      await dbTransferStock(selectedId, currentStoreId, toStoreId, qty, userId, userName);
      onUpdate();
      setQty(1);
      alert("Stock transferred successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to transfer stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><ArrowRightLeft className="text-accent" /> Stock Transfer</h3>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Product to Transfer</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full">
            <option value="">Choose a product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Available: {p.stock})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Quantity</label>
            <input type="number" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 0)} min={1} />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Destination Location</label>
            <select value={toStoreId} onChange={(e) => setToStoreId(e.target.value)} className="w-full">
              <option value="">Select location...</option>
              {stores.filter(s => s.id !== currentStoreId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleTransfer}
          disabled={!selectedId || !toStoreId || qty <= 0 || isSubmitting}
          className="btn-accent w-full py-3 flex items-center justify-center gap-2 font-bold"
        >
          {isSubmitting ? <RefreshCw className="spin" /> : <ArrowRightLeft size={18} />}
          Initiate Transfer
        </button>
      </div>
    </div>
  );
}

function HistoryTab({ history, products, curr }: { history: InventoryTransaction[], products: Product[], curr: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Inventory Audit Trail</h3>
        <div className="flex gap-2">
           <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="pl-9 py-1.5 text-xs w-48" placeholder="Search by Product ID..." />
           </div>
           <button className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1 border border-border"><Filter size={14} /> Filter</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs text-muted-foreground">
              <th className="text-left p-3 font-medium">DATE</th>
              <th className="text-left p-3 font-medium">PRODUCT</th>
              <th className="text-left p-3 font-medium">TYPE</th>
              <th className="text-center p-3 font-medium">QTY</th>
              <th className="text-center p-3 font-medium">RESULT</th>
              <th className="text-left p-3 font-medium">USER</th>
              <th className="text-left p-3 font-medium">REASON/REF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {history.map(tx => {
              const productName = products.find(p => p.id === tx.product_id)?.name || tx.product_id;
              return (
                <tr key={tx.id} className="hover:bg-accent/5">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                  <td className="p-3 font-medium">{productName}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      tx.type === 'sale' ? 'bg-blue-500/10 text-blue-500' :
                      tx.type === 'adjustment' ? 'bg-amber-500/10 text-amber-500' :
                      tx.type === 'transfer_in' || tx.type === 'transfer_out' ? 'bg-purple-500/10 text-purple-500' :
                      tx.type === 'refund' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {tx.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`p-3 text-center font-bold ${tx.quantity > 0 ? "text-green-500" : "text-destructive"}`}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </td>
                  <td className="p-3 text-center font-mono text-xs">{tx.previous_stock} → {tx.new_stock}</td>
                  <td className="p-3 text-muted-foreground">{tx.user_name}</td>
                  <td className="p-3 max-w-xs truncate text-xs" title={tx.reason || ""}>
                    {tx.reason || tx.reference_id || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReconcileTab({ products, onUpdate, userId, storeId }: { products: Product[], onUpdate: () => void, userId: string, storeId: string }) {
  const [items, setItems] = useState<StockCountItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialItems = products.map(p => ({
      id: uuid(),
      count_id: "",
      product_id: p.id,
      product_name: p.name,
      system_stock: p.stock,
      actual_stock: p.stock,
      difference: 0
    }));
    setItems(initialItems);
  }, [products]);

  const updateActual = (productId: string, actual: number) => {
    setItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        return { ...item, actual_stock: actual, difference: actual - item.system_stock };
      }
      return item;
    }));
  };

  const handleSaveCount = async (status: "draft" | "completed") => {
    if (status === "completed" && !confirm("This will permanently adjust your inventory levels to match the 'Actual' counts. Proceed?")) return;

    setIsSubmitting(true);
    try {
      const count: StockCount = {
        id: uuid(),
        store_id: storeId,
        status,
        notes,
        user_id: userId,
        created_at: new Date().toISOString(),
        items
      };
      await dbSaveStockCount(count);
      if (status === "completed") {
        onUpdate();
        alert("Stock levels updated based on physical count.");
      } else {
        alert("Stock count saved as draft.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save stock count");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Physical Inventory Count</h3>
          <p className="text-sm text-muted-foreground">Compare system records with actual physical stock.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSaveCount("draft")} disabled={isSubmitting} className="btn-ghost py-2 px-4 border border-border">Save Draft</button>
          <button onClick={() => handleSaveCount("completed")} disabled={isSubmitting} className="btn-accent py-2 px-6 font-bold">Submit & Reconcile</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs text-muted-foreground">
              <th className="text-left p-3 font-medium">PRODUCT</th>
              <th className="text-center p-3 font-medium">SYSTEM STOCK</th>
              <th className="text-center p-3 font-medium">ACTUAL COUNT</th>
              <th className="text-center p-3 font-medium">DIFFERENCE</th>
              <th className="text-left p-3 font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(item => (
              <tr key={item.product_id} className="hover:bg-accent/5">
                <td className="p-3 font-medium">{item.product_name}</td>
                <td className="p-3 text-center">{item.system_stock}</td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    value={item.actual_stock}
                    onChange={(e) => updateActual(item.product_id, parseInt(e.target.value) || 0)}
                    className="w-20 text-center py-1 mx-auto"
                  />
                </td>
                <td className={`p-3 text-center font-bold ${item.difference === 0 ? "" : item.difference > 0 ? "text-green-500" : "text-destructive"}`}>
                  {item.difference > 0 ? `+${item.difference}` : item.difference}
                </td>
                <td className="p-3">
                   {item.difference === 0 ? (
                     <span className="text-[10px] font-bold text-muted-foreground uppercase">Matches</span>
                   ) : (
                     <span className="text-[10px] font-bold text-amber-500 uppercase">Discrepancy</span>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Count Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional information about this count (e.g., Q3 Monthly Audit)..."
          rows={3}
        />
      </div>
    </div>
  );
}
