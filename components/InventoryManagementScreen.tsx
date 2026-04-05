"use client";
import { useState, useEffect } from "react";
import {
  Boxes,
  Search,
  Plus,
  ArrowRightLeft,
  History,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Calendar,
  User,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Package,
  Check,
  X,
  PlusCircle,
  Clock,
  Download,
  ShieldCheck,
  BarChart3
} from "lucide-react";
import { useSettingsStore, useProductsStore, useAuthStore, useStoresStore } from "@/lib/stores";
import {
  dbGetProducts, Product, dbUpdateStock, dbTransferStock,
  dbGetInventoryTransactions, InventoryTransaction,
  dbCalculateValuation, dbGetStockCounts, StockCount, dbSaveStockCount,
  Batch, dbGetBatches, dbSaveBatch,
  SerialNumber, dbGetSerialNumbers, dbSaveSerialNumber
} from "@/lib/db";
import { v4 as uuid } from 'uuid';

type Tab = 'overview' | 'adjustments' | 'transfers' | 'audit' | 'counts';

export default function InventoryManagementScreen() {
  const { activeStoreId, settings } = useSettingsStore();
  const { user } = useAuthStore();
  const { stores } = useStoresStore();
  const { products, fetchProducts } = useProductsStore();

  const curr = settings?.currency_symbol ?? "₹";

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [valuation, setValuation] = useState({ AVG: 0, FIFO: 0, LIFO: 0 });
  const [valuationMethod, setValuationMethod] = useState<'AVG' | 'FIFO' | 'LIFO'>('AVG');
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);

  // Modals / Forms State
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isCounting, setIsCounting] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadInventoryData();
  }, [activeStoreId, activeTab, products.length]);

  const loadInventoryData = async () => {
    setIsLoading(true);
    try {
      await fetchProducts();

      if (activeTab === 'overview' || activeTab === 'adjustments' || activeTab === 'transfers') {
        const [avg, fifo, lifo] = await Promise.all([
          dbCalculateValuation(activeStoreId, 'AVG'),
          dbCalculateValuation(activeStoreId, 'FIFO'),
          dbCalculateValuation(activeStoreId, 'LIFO')
        ]);
        setValuation({ AVG: avg, FIFO: fifo, LIFO: lifo });
      } else if (activeTab === 'audit') {
        // Correct logic: Get all products and fetch their transactions
        const productIds = products.map(p => p.id);
        const txPromises = productIds.map(id => dbGetInventoryTransactions(id, activeStoreId));
        const txResults = await Promise.all(txPromises);
        const allTxs = txResults.flat();

        setTransactions(allTxs.sort((a, b) => b.created_at.localeCompare(a.created_at)));
      } else if (activeTab === 'counts') {
        const counts = await dbGetStockCounts(activeStoreId);
        setStockCounts(counts);
      }
    } catch (err) {
      console.error("Failed to load inventory data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-bg">
      <header className="p-6 border-b border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5C842]/10 flex items-center justify-center text-[#F5C842]">
            <Boxes size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground text-sm">Track stock, batches, and valuations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadInventoryData}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <RefreshCw size={20} className={isLoading ? 'spin' : ''} />
          </button>
          <div className="flex bg-muted p-1 rounded-xl">
            {(['overview', 'adjustments', 'transfers', 'audit', 'counts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
                  activeTab === tab ? 'bg-surface text-[#F5C842] shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6">
        {(activeTab === 'overview' || activeTab === 'adjustments' || activeTab === 'transfers') && (
          <div className="h-full flex flex-col gap-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-border p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-muted-foreground text-sm font-medium">Inventory Valuation</span>
                  <div className="flex items-center gap-1">
                    <select
                      value={valuationMethod}
                      onChange={(e) => setValuationMethod(e.target.value as 'AVG' | 'FIFO' | 'LIFO')}
                      className="bg-transparent text-[10px] font-bold uppercase border border-border rounded px-1"
                    >
                      <option value="AVG">AVG</option>
                      <option value="FIFO">FIFO</option>
                      <option value="LIFO">LIFO</option>
                    </select>
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#F5C842]">
                  {curr}{valuation[valuationMethod].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-surface border border-border p-5 rounded-2xl">
                <span className="text-muted-foreground text-sm font-medium">Total SKUs</span>
                <div className="text-2xl font-bold mt-3">{products.length}</div>
              </div>

              <div className="bg-surface border border-border p-5 rounded-2xl">
                <span className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                  Low Stock Items <AlertTriangle size={14} className="text-red-500" />
                </span>
                <div className="text-2xl font-bold mt-3 text-red-500">
                  {products.filter(p => p.stock <= 10).length}
                </div>
              </div>

              <div className="bg-surface border border-border p-5 rounded-2xl">
                <span className="text-muted-foreground text-sm font-medium">Pending Counts</span>
                <div className="text-2xl font-bold mt-3 text-blue-500">
                  {stockCounts.filter(c => c.status === 'draft').length}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-surface border border-border rounded-2xl flex flex-col overflow-hidden">
               <div className="p-4 border-b border-border flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      type="text"
                      placeholder="Search items by name, SKU or barcode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-muted border-none rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-[#F5C842]/50 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setIsCounting(true)}
                    className="flex items-center gap-2 bg-[#F5C842] text-[#0D0D0F] px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity"
                  >
                    <ClipboardCheck size={18} />
                    Start Stock Count
                  </button>
               </div>

               <div className="flex-1 overflow-auto">
                 <table className="w-full border-collapse">
                   <thead className="sticky top-0 bg-surface z-10">
                     <tr className="border-b border-border">
                       <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                       <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                       <th className="text-right p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Stock Level</th>
                       <th className="text-right p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Cost Price</th>
                       <th className="text-right p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Value</th>
                       <th className="p-4"></th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredProducts.map(product => (
                       <tr key={product.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                         <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Package size={20} className="text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-bold text-foreground">{product.name}</div>
                                <div className="text-xs text-muted-foreground">{product.sku || product.id.slice(0,8)}</div>
                              </div>
                            </div>
                         </td>
                         <td className="p-4">
                           <span className="px-2.5 py-1 rounded-full bg-muted text-[10px] font-bold uppercase text-muted-foreground">
                             {product.category}
                           </span>
                         </td>
                         <td className="p-4 text-right">
                            <div className={`font-bold ${product.stock <= 10 ? 'text-red-500' : 'text-foreground'}`}>
                              {product.stock} <span className="text-[10px] text-muted-foreground font-normal ml-1">{product.base_unit || 'pcs'}</span>
                            </div>
                         </td>
                         <td className="p-4 text-right font-medium text-muted-foreground">
                            {curr}{product.cost_price.toFixed(2)}
                         </td>
                         <td className="p-4 text-right font-bold">
                            {curr}{(product.stock * product.cost_price).toFixed(2)}
                         </td>
                         <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button
                                 title="Stock Adjustment"
                                 onClick={() => { setSelectedProduct(product); setIsAdjusting(true); }}
                                 className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors"
                               >
                                 <TrendingUp size={16} />
                               </button>
                               <button
                                 title="Transfer"
                                 onClick={() => { setSelectedProduct(product); setIsTransferring(true); }}
                                 className="p-2 rounded-lg hover:bg-purple-500/10 text-purple-500 transition-colors"
                               >
                                 <ArrowRightLeft size={16} />
                               </button>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="h-full flex flex-col bg-surface border border-border rounded-2xl overflow-hidden">
             <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                   <History size={18} className="text-[#F5C842]" />
                   Inventory Audit Trail
                </h2>
                <div className="flex gap-2">
                   <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80">
                      <Calendar size={14} />
                      Last 30 Days
                   </button>
                   <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80">
                      <Filter size={14} />
                      All Types
                   </button>
                </div>
             </div>
             <div className="flex-1 overflow-auto">
               <table className="w-full">
                 <thead className="sticky top-0 bg-surface z-10">
                   <tr className="border-b border-border">
                     <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Date & Time</th>
                     <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Product</th>
                     <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Type</th>
                     <th className="text-right p-4 text-xs font-bold text-muted-foreground uppercase">Quantity</th>
                     <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Reference</th>
                     <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">User</th>
                   </tr>
                 </thead>
                 <tbody>
                   {transactions.map(tx => {
                     const isPositive = tx.qty_delta > 0;
                     return (
                       <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                         <td className="p-4 text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                         </td>
                         <td className="p-4">
                            <div className="font-bold text-sm">
                              {products.find(p => p.id === tx.product_id)?.name || tx.product_id}
                            </div>
                         </td>
                         <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.transaction_type === 'in' ? 'bg-green-500/10 text-green-500' :
                              tx.transaction_type === 'out' ? 'bg-red-500/10 text-red-500' :
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {tx.transaction_type}
                            </span>
                         </td>
                         <td className={`p-4 text-right font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{tx.qty_delta}
                         </td>
                         <td className="p-4 text-sm text-muted-foreground">
                            {tx.reference_type && (
                              <div className="flex items-center gap-1 capitalize">
                                <span className="text-foreground">{tx.reference_type}</span>
                                {tx.reference_id && <span className="opacity-50">#{tx.reference_id.slice(-6)}</span>}
                              </div>
                            )}
                         </td>
                         <td className="p-4 text-sm font-medium">
                            {tx.user_id}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'counts' && (
          <div className="h-full flex flex-col gap-6 overflow-y-auto">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                  onClick={() => setIsCounting(true)}
                  className="bg-surface border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-[#F5C842]/50 hover:bg-[#F5C842]/5 transition-all group"
                >
                   <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-[#F5C842]/20 group-hover:text-[#F5C842] transition-all">
                      <PlusCircle size={32} />
                   </div>
                   <div className="text-center">
                      <h3 className="font-bold text-lg">New Physical Count</h3>
                      <p className="text-sm text-muted-foreground">Audit your store stock levels</p>
                   </div>
                </button>

                {stockCounts.map(count => (
                  <div key={count.id} className="bg-surface border border-border rounded-3xl p-6 relative overflow-hidden group">
                     <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase ${
                       count.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                       count.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                       'bg-blue-500/10 text-blue-500'
                     }`}>
                       {count.status}
                     </div>

                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                           <ClipboardCheck size={24} />
                        </div>
                        <div>
                           <div className="font-bold truncate max-w-[150px]">Physical Count</div>
                           <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(count.created_at).toLocaleDateString()}
                           </div>
                        </div>
                     </div>

                     <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-muted-foreground">Items Audited</span>
                           <span className="font-bold">{count.items?.length || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-muted-foreground">Performed by</span>
                           <span className="font-bold truncate max-w-[120px]">{count.created_by}</span>
                        </div>
                     </div>

                     <div className="flex gap-2">
                        <button className="flex-1 py-2 rounded-xl bg-muted text-xs font-bold hover:bg-muted/80 transition-colors">
                           View Details
                        </button>
                        {count.status === 'completed' && (
                           <button className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">
                              <Download size={16} />
                           </button>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* Modals placeholders */}
      {isCounting && (
        <StockCountModal
          onClose={() => setIsCounting(false)}
          products={products}
          userId={user?.name || "System"}
          storeId={activeStoreId}
          onComplete={loadInventoryData}
        />
      )}

      {isAdjusting && selectedProduct && (
        <AdjustmentModal
          product={selectedProduct}
          onClose={() => { setIsAdjusting(false); setSelectedProduct(null); }}
          onComplete={loadInventoryData}
        />
      )}

      {isTransferring && selectedProduct && (
        <TransferModal
          product={selectedProduct}
          onClose={() => { setIsTransferring(false); setSelectedProduct(null); }}
          onComplete={loadInventoryData}
        />
      )}
    </div>
  );
}

function TransferModal({ product, onClose, onComplete }: any) {
  const { activeStoreId } = useSettingsStore();
  const { user } = useAuthStore();
  const { stores } = useStoresStore();
  const [qty, setQty] = useState(1);
  const [targetStoreId, setTargetStoreId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStoreId) return;
    setIsSaving(true);
    try {
      await dbTransferStock(product.id, activeStoreId, targetStoreId, qty, user?.id || "system");
      onComplete();
      onClose();
    } catch (err) {
      alert("Failed to transfer stock");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
       <div className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
          <header className="p-6 border-b border-border flex items-center justify-between">
             <h2 className="text-xl font-bold">Inter-Store Transfer</h2>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X size={20} />
             </button>
          </header>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
             <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-muted-foreground">
                   <Package size={24} />
                </div>
                <div>
                   <div className="font-bold">{product.name}</div>
                   <div className="text-xs text-muted-foreground">Current Stock: {product.stock} {product.base_unit || 'pcs'}</div>
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground ml-1">Destination Store</label>
                <select
                   required
                   value={targetStoreId}
                   onChange={(e) => setTargetStoreId(e.target.value)}
                   className="w-full bg-muted border-none rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-[#F5C842]/50 appearance-none"
                >
                   <option value="">Select Destination...</option>
                   {stores.filter(s => s.id !== activeStoreId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                   ))}
                </select>
             </div>

             <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground ml-1">Quantity to Transfer</label>
                <input
                   required
                   type="number"
                   min="1"
                   max={product.stock}
                   value={qty}
                   onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                   className="w-full bg-muted border-none rounded-xl p-3 font-bold text-lg outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                />
             </div>

             <button
                type="submit"
                disabled={isSaving || !targetStoreId || qty > product.stock}
                className="w-full py-4 rounded-xl font-bold mt-4 transition-all active:scale-95 disabled:opacity-50 bg-purple-500 text-white"
             >
                {isSaving ? 'Processing...' : 'Confirm Transfer'}
             </button>
          </form>
       </div>
    </div>
  );
}

// Helper Components

function StockCountModal({ onClose, products, userId, storeId, onComplete }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const startCount = () => {
    setItems(products.map((p: Product) => ({
      id: uuid(),
      product_id: p.id,
      name: p.name,
      expected_qty: p.stock,
      actual_qty: p.stock
    })));
  };

  useEffect(() => {
    startCount();
  }, [products]);

  const handleSave = async (status: 'draft' | 'completed') => {
    setIsSaving(true);
    try {
      const count: StockCount = {
        id: uuid(),
        store_id: storeId,
        status,
        created_by: userId,
        created_at: new Date().toISOString(),
        items: items.map(i => ({
          id: i.id,
          count_id: "",
          product_id: i.product_id,
          expected_qty: i.expected_qty,
          actual_qty: i.actual_qty
        }))
      };
      await dbSaveStockCount(count);
      onComplete();
      onClose();
    } catch (err) {
      alert("Failed to save stock count");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-surface border border-border w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <header className="p-6 border-b border-border flex items-center justify-between">
           <div>
              <h2 className="text-xl font-bold">Physical Stock Count</h2>
              <p className="text-sm text-muted-foreground">Performing audit for {userId}</p>
           </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
              <X size={20} />
           </button>
        </header>

        <div className="flex-1 overflow-auto">
           <table className="w-full">
              <thead className="sticky top-0 bg-surface z-10 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Product</th>
                  <th className="text-right p-4 text-xs font-bold text-muted-foreground uppercase">System Stock</th>
                  <th className="text-center p-4 text-xs font-bold text-muted-foreground uppercase">Physical Stock</th>
                  <th className="text-right p-4 text-xs font-bold text-muted-foreground uppercase">Difference</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const diff = item.actual_qty - item.expected_qty;
                  return (
                    <tr key={item.product_id} className="border-b border-border/50">
                      <td className="p-4 font-bold">{item.name}</td>
                      <td className="p-4 text-right text-muted-foreground font-medium">{item.expected_qty}</td>
                      <td className="p-4">
                         <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => {
                                const newItems = [...items];
                                newItems[idx].actual_qty = Math.max(0, newItems[idx].actual_qty - 1);
                                setItems(newItems);
                              }}
                              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                            >
                               <TrendingDown size={14} />
                            </button>
                            <input
                              type="number"
                              value={item.actual_qty}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].actual_qty = parseInt(e.target.value) || 0;
                                setItems(newItems);
                              }}
                              className="w-16 bg-muted border-none rounded-lg p-1.5 text-center font-bold outline-none"
                            />
                            <button
                              onClick={() => {
                                const newItems = [...items];
                                newItems[idx].actual_qty += 1;
                                setItems(newItems);
                              }}
                              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                            >
                               <TrendingUp size={14} />
                            </button>
                         </div>
                      </td>
                      <td className={`p-4 text-right font-bold ${diff === 0 ? 'text-muted-foreground' : diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                         {diff > 0 ? '+' : ''}{diff}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
           </table>
        </div>

        <footer className="p-6 border-t border-border flex justify-end gap-3 bg-muted/50">
           <button
             onClick={() => handleSave('draft')}
             disabled={isSaving}
             className="px-6 py-2.5 rounded-xl border border-border font-bold hover:bg-muted transition-colors disabled:opacity-50"
           >
             Save Draft
           </button>
           <button
             onClick={() => handleSave('completed')}
             disabled={isSaving}
             className="px-6 py-2.5 rounded-xl bg-[#F5C842] text-[#0D0D0F] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
           >
             <ShieldCheck size={18} />
             Finalize & Adjust Stock
           </button>
        </footer>
      </div>
    </div>
  );
}

function AdjustmentModal({ product, onClose, onComplete }: any) {
  const { activeStoreId } = useSettingsStore();
  const { user } = useAuthStore();
  const [delta, setDelta] = useState(1);
  const [type, setType] = useState<'in' | 'out'>('in');
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalDelta = type === 'in' ? delta : -delta;
      await dbUpdateStock(product.id, finalDelta, activeStoreId, user?.id || "system");
      onComplete();
      onClose();
    } catch (err) {
      alert("Failed to adjust stock");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
       <div className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
          <header className="p-6 border-b border-border flex items-center justify-between">
             <h2 className="text-xl font-bold">Manual Stock Adjustment</h2>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X size={20} />
             </button>
          </header>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
             <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-muted-foreground">
                   <Package size={24} />
                </div>
                <div>
                   <div className="font-bold">{product.name}</div>
                   <div className="text-xs text-muted-foreground">Current Stock: {product.stock} {product.base_unit || 'pcs'}</div>
                </div>
             </div>

             <div className="flex bg-muted p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('in')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    type === 'in' ? 'bg-green-500 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ArrowUpRight size={18} />
                  Stock In (+)
                </button>
                <button
                  type="button"
                  onClick={() => setType('out')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    type === 'out' ? 'bg-red-500 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ArrowDownLeft size={18} />
                  Stock Out (-)
                </button>
             </div>

             <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground ml-1">Quantity</label>
                <input
                   required
                   type="number"
                   min="1"
                   value={delta}
                   onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
                   className="w-full bg-muted border-none rounded-xl p-3 font-bold text-lg outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                />
             </div>

             <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground ml-1">Reason / Note</label>
                <textarea
                   required
                   value={reason}
                   onChange={(e) => setReason(e.target.value)}
                   placeholder="e.g. Damaged during delivery, Restock, Return..."
                   className="w-full bg-muted border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#F5C842]/50 h-24 resize-none"
                />
             </div>

             <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-4 rounded-xl font-bold mt-4 transition-all active:scale-95 disabled:opacity-50 ${
                  type === 'in' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}
             >
                {isSaving ? 'Processing...' : `Confirm ${type === 'in' ? 'Increase' : 'Decrease'}`}
             </button>
          </form>
       </div>
    </div>
  );
}
