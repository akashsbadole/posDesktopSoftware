"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, X, Printer, ChevronRight, User, RefreshCw, Share, Mail, Save, MessageCircle, Clock, FolderOpen, Tag, Wallet, Package } from "lucide-react";
import { dbSaveOrder, generateReceipt, dbGetHeldOrders, dbDeletePendingOrder, validateCoupon, useCoupon, getCustomerWallet, deductWalletBalance, dbGetCustomerByPhone, Coupon, CustomerWallet, Combo, dbHoldOrder, openCashDrawer, printReceipt, openWhatsAppShare, openEmailShare, saveReceiptToFile } from "@/lib/db";
import { useCartStore, useProductsStore, useSettingsStore, useAuthStore, useCombosStore } from "@/lib/stores";
import { useGridNavigation } from "@/lib/keyboard";
import { v4 as uuid } from "uuid";
import { Order } from "@/lib/db";

export default function POSScreen() {
  const { 
    items: cart, 
    orderType, 
    customerInfo, 
    tableName,
    notes, 
    globalDiscount, 
    paymentMethod, 
    amountPaid,
    originalOrderId,
    addItem, 
    updateQuantity, 
    updateItemDiscount,
    setOrderType, 
    setCustomerInfo, 
    setNotes, 
    setGlobalDiscount,
    setPaymentMethod,
    setAmountPaid,
    setOriginalOrderId,
    clearCart,
    getSubtotal, 
    getTaxAmount, 
    getDiscountAmount, 
    getTotal,
    getItemCount,
    toOrder
  } = useCartStore();

  const { 
    products, 
    categories, 
    isLoading: productsLoading, 
    fetchProducts, 
    getFilteredProducts,
    setSelectedCategory,
    setSearchQuery,
    selectedCategory,
    searchQuery
  } = useProductsStore();

  const { combos, fetchCombos, getActiveCombos } = useCombosStore();

  const { settings, fetchSettings } = useSettingsStore();
  const { user } = useAuthStore();

  const [receipt, setReceipt] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);
  const [isGridFocused, setIsGridFocused] = useState(false);
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const productGridRef = useRef<HTMLDivElement>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletCustomerId, setWalletCustomerId] = useState<string | null>(null);

  useEffect(() => { 
    fetchProducts(); 
    fetchSettings();
    loadHeldOrders();
    fetchCombos();
  }, []);

  const loadHeldOrders = async () => {
    const h = await dbGetHeldOrders();
    setHeldOrders(h);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "c" || e.key === "C") {
        if (cart.length > 0) {
          clearCart();
        }
      }
      if (e.key === "p" || e.key === "P") {
        const checkoutBtn = document.querySelector('[data-checkout-button]') as HTMLButtonElement;
        if (checkoutBtn && !checkoutBtn.disabled) {
          checkoutBtn.click();
        }
      }
      if (e.key === "1") setOrderType("dine_in");
      if (e.key === "2") setOrderType("takeaway");
      if (e.key === "3") setOrderType("delivery");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart.length, clearCart, setOrderType]);

  const filtered = getFilteredProducts();

  const getGridColumns = useCallback(() => {
    if (productGridRef.current) {
      const width = productGridRef.current.clientWidth;
      return Math.floor(width / 150) || 4;
    }
    return 4;
  }, []);

  const getNewIndex = useGridNavigation(filtered.length, () => {}, getGridColumns());

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const exactMatch = products.find((p) => p.barcode === searchQuery.trim());
      if (exactMatch) {
        addItem(exactMatch);
        setSearchQuery("");
      }
    }
    if (e.key === "Escape") {
      setSearchQuery("");
      (e.target as HTMLInputElement).blur();
      setIsGridFocused(true);
    }
  };

  const handleProductGridKeyDown = (e: React.KeyboardEvent) => {
    if (!isGridFocused) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setIsGridFocused(true);
        if (focusedProductIndex === -1) {
          setFocusedProductIndex(0);
        }
        return;
      }
    }

    if (focusedProductIndex >= 0) {
      const newIndex = getNewIndex(focusedProductIndex, e.key);
      if (newIndex !== focusedProductIndex) {
        e.preventDefault();
        setFocusedProductIndex(newIndex);
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (filtered[focusedProductIndex]) {
          addItem(filtered[focusedProductIndex]);
        }
      }
    }
  };

  const handleAddToCart = (product: typeof products[0]) => {
    if (product.stock === 0) return;
    addItem(product);
  };

  const handleAddComboToCart = (combo: Combo) => {
    combo.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        for (let i = 0; i < item.quantity; i++) {
          addItem(product);
        }
      }
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const coupon = await validateCoupon(couponCode.trim(), getSubtotal());
      setAppliedCoupon(coupon);
      setCouponError("");
    } catch (err) {
      setCouponError(String(err));
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const lookupCustomerWallet = async (phone: string) => {
    if (!phone || phone.length < 7) return;
    try {
      const customer = await dbGetCustomerByPhone(phone);
      if (customer) {
        const wallet = await getCustomerWallet(customer.id);
        setWalletBalance(wallet.balance);
        setWalletCustomerId(customer.id);
      } else {
        setWalletBalance(0);
        setWalletCustomerId(null);
      }
    } catch {
      setWalletBalance(0);
      setWalletCustomerId(null);
    }
  };

  const totals = {
    subtotal: getSubtotal(),
    tax_amount: getTaxAmount(),
    discount_amount: getDiscountAmount(),
    total: getTotal()
  };

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? totals.subtotal * (appliedCoupon.discount_value / 100)
      : appliedCoupon.discount_value
    : 0;

  const walletDeduction = useWallet && walletCustomerId ? Math.min(walletBalance, totals.total - couponDiscount) : 0;

  const finalTotal = Math.max(0, totals.total - couponDiscount - walletDeduction);

  const change = Math.max(0, amountPaid - finalTotal);

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    
    const newErrors: Record<string, string> = {};
    
    if (orderType === "delivery") {
      if (!customerInfo?.phone || customerInfo.phone.trim().length < 7) {
        newErrors.phone = "Phone number required for delivery";
      }
      if (!customerInfo?.address || customerInfo.address.trim().length < 5) {
        newErrors.address = "Delivery address required";
      }
    }
    
    if (paymentMethod === "cash" && (amountPaid || 0) < finalTotal) {
      newErrors.amount = "Insufficient amount tendered";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setProcessing(true);

    const orderId = originalOrderId || uuid();
    const order = toOrder(orderId, user?.id || "system", user?.name || "System");
    order.payment_method = paymentMethod;
    order.amount_paid = paymentMethod === "cash" ? (amountPaid || 0) : finalTotal;
    order.change_amount = paymentMethod === "cash" ? change : 0;
    order.customer_name = customerInfo?.name || "";
    order.delivery_status = orderType === "delivery" ? "pending" : "delivered";
    order.delivery_address = customerInfo?.address || "";
    order.delivery_phone = customerInfo?.phone || "";
    order.discount_amount = totals.discount_amount + couponDiscount + walletDeduction;
    order.total = finalTotal;

    try {
      await dbSaveOrder(order);

      if (appliedCoupon) {
        try { await useCoupon(appliedCoupon.code); } catch (e) { console.error("Failed to mark coupon used:", e); }
      }
      if (useWallet && walletCustomerId && walletDeduction > 0) {
        try { await deductWalletBalance(walletCustomerId, walletDeduction, order.id); } catch (e) { console.error("Failed to deduct wallet:", e); }
      }

      try {
        await openCashDrawer();
      } catch (e) {
        console.log("Cash drawer not available");
      }

      const rec = generateReceipt(order, settings);
      setReceipt(rec);
      clearCart();
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError("");
      setUseWallet(false);
      setWalletBalance(0);
      setWalletCustomerId(null);
      await Promise.all([fetchProducts(), loadHeldOrders()]);
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Failed to complete order. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleHoldOrder = async () => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);

    const order = toOrder(uuid(), user?.id || "system", user?.name || "System");
    order.status = "hold";
    order.payment_method = "cash";
    order.amount_paid = 0;
    order.change_amount = 0;
    order.customer_name = customerInfo?.name || "";
    order.delivery_status = "pending";
    order.delivery_address = customerInfo?.address || "";
    order.delivery_phone = customerInfo?.phone || "";

    try {
      await dbHoldOrder(order);
      alert("Order held successfully!");
      clearCart();
      await loadHeldOrders();
    } catch (err) {
      console.error("Failed to hold order:", err);
      alert("Failed to hold order. Please try again.");
    }
    setProcessing(false);
  };

  const handlePrintKOT = async () => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);

    const order = toOrder(uuid(), user?.id || "system", user?.name || "System");
    order.status = "processing";
    order.payment_method = "cash";
    order.amount_paid = 0;
    order.change_amount = 0;
    order.customer_name = customerInfo?.name || "";
    order.delivery_status = "pending";
    order.delivery_address = customerInfo?.address || "";
    order.delivery_phone = customerInfo?.phone || "";

    try {
      await dbSaveOrder(order);
      const kotText = generateKOTText(order);
      await printReceipt(kotText);
      alert("KOT sent to printer!");
      clearCart();
    } catch (err) {
      console.error("Failed to print KOT:", err);
      alert("Failed to print KOT");
    }
    setProcessing(false);
  };

  const generateKOTText = (order: Order): string => {
    const lines = [
      "=".repeat(32),
      "KITCHEN ORDER TICKET",
      "=".repeat(32),
      `Order #: ${order.id.slice(0, 8).toUpperCase()}`,
      `Type: ${order.order_type.toUpperCase()}`,
      `Table: ${tableName || "N/A"}`,
      `Customer: ${order.customer_name || "Guest"}`,
      `Time: ${new Date().toLocaleTimeString()}`,
      "-".repeat(32),
      "ITEMS:",
      ...order.items.map((item, idx) => 
        `${idx + 1}. ${item.product_name} x${item.quantity}`
      ),
      "-".repeat(32),
      notes ? `Notes: ${notes}` : "",
      "=".repeat(32),
      "",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleRestoreOrder = (order: Order) => {
    const restoredCart = order.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (product) {
        return {
          product,
          quantity: item.quantity,
          discount: item.discount,
        };
      }
      return null;
    }).filter((item): item is { product: typeof products[0]; quantity: number; discount: number } => item !== null);

    if (restoredCart.length > 0) {
      restoredCart.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          addItem(item.product);
        }
      });
      setCustomerInfo({ name: order.customer_name, phone: order.delivery_phone, address: order.delivery_address });
      setOrderType(order.order_type as "dine_in" | "takeaway" | "delivery");
      setShowHeldOrders(false);
    }
  };

  const handleDeleteHeldOrder = async (id: string) => {
    if (!confirm("Delete this held order?")) return;
    try {
      await dbDeletePendingOrder(id);
      await loadHeldOrders();
    } catch (err) {
      console.error("Failed to delete held order:", err);
    }
  };

  const curr = settings?.currency_symbol ?? "₹";

  const handlePrint = async () => {
    if (!receipt) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                padding: 10px;
                margin: 0;
                white-space: pre-wrap;
              }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>${receipt}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } else {
      window.print();
    }
  };

  const handleWhatsAppShare = async () => {
    if (!receipt) return;
    try {
      await openWhatsAppShare(receipt);
    } catch {
      const encoded = encodeURIComponent(receipt);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  const handleEmailShare = async () => {
    if (!receipt) return;
    const subject = `Receipt - ${new Date().toLocaleDateString()}`;
    try {
      await openEmailShare(receipt, subject);
    } catch {
      const encoded = encodeURIComponent(receipt);
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encoded}`, "_blank");
    }
  };

  const handleSaveReceipt = async () => {
    if (!receipt) return;
    const date = new Date().toISOString().split("T")[0];
    const fileName = `receipt_${date}_${uuid()}.txt`;
    try {
      const path = await saveReceiptToFile(receipt, fileName);
      alert(`Receipt saved to: ${path}`);
    } catch (err) {
      console.error("Failed to save receipt:", err);
    }
  };

  const handleClearCart = () => clearCart();
  const handleRemoveItem = (productId: string) => useCartStore.getState().removeItem(productId);
  const itemCount = getItemCount();

  if (receipt) {
    return (
      <div className="h-full flex items-center justify-center bg-bg" role="region" aria-label="Order complete">
        <div className="card p-6 w-96 fade-in" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
          <div className="flex items-center justify-between mb-4">
            <h2 id="receipt-title" className="font-display text-lg" style={{ color: "#F5C842" }}>Order Complete!</h2>
            <button onClick={() => setReceipt(null)} className="btn-ghost py-1 px-3" aria-label="Close and start new order"><X size={16} aria-hidden="true" /></button>
          </div>
          <pre className="text-xs font-mono p-4 rounded-lg overflow-auto"
            style={{ background: "#0A0A0C", color: "#9090A8", maxHeight: 340, whiteSpace: "pre", lineHeight: 1.5 }}
            aria-label="Receipt content" role="region">
            {receipt}
          </pre>
          <div className="flex gap-2 mt-4" role="group" aria-label="Receipt actions">
            <button className="btn-accent flex-1 flex items-center justify-center gap-2 py-3" onClick={() => setReceipt(null)}>
              <Plus size={16} aria-hidden="true" /> New Order
            </button>
            <button className="btn-ghost py-3 px-3 flex items-center gap-1.5" onClick={handlePrint} aria-label="Print receipt">
              <Printer size={16} aria-hidden="true" />
            </button>
            <button className="btn-ghost py-3 px-3 flex items-center gap-1.5" onClick={handleWhatsAppShare} aria-label="Share receipt on WhatsApp">
              <MessageCircle size={16} aria-hidden="true" />
            </button>
            <button className="btn-ghost py-3 px-3 flex items-center gap-1.5" onClick={handleEmailShare} aria-label="Share receipt via email">
              <Mail size={16} aria-hidden="true" />
            </button>
            <button className="btn-ghost py-3 px-3 flex items-center gap-1.5" onClick={handleSaveReceipt} aria-label="Save receipt to file">
              <Save size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allCategories = ["All", "Combos", ...categories];
  const activeCombos = getActiveCombos();
  const showCombos = selectedCategory === "Combos";

  return (
    <div className="flex h-full overflow-hidden" id="main-content" role="main" aria-label="POS Screen">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex gap-3 mb-4" role="search" aria-label="Product search">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} aria-hidden="true" />
            <label htmlFor="product-search" className="sr-only">Search or scan barcode</label>
            <input 
              id="product-search"
              placeholder="Search or scan barcode..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              onKeyDown={handleSearchKeyDown} 
              style={{ paddingLeft: 36 }} 
              aria-describedby="search-hint"
            />
            <span id="search-hint" className="sr-only">Press Enter to search by barcode, Escape to clear</span>
          </div>
          <div className="flex gap-1" role="group" aria-label="Filter by category">
            {allCategories.map((c) => {
              const isSelected = c === "All" ? !selectedCategory : selectedCategory === c;
              const isCombos = c === "Combos";
              return (
                <button 
                  key={c} 
                  onClick={() => setSelectedCategory(c === "All" ? null : c === "Combos" ? "Combos" : c)}
                  aria-pressed={isSelected}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842] flex items-center gap-1"
                  style={{
                    background: isSelected ? "rgba(245,200,66,0.1)" : "#141418",
                    color: isSelected ? "#F5C842" : "#4A4A5A",
                    border: `1px solid ${isSelected ? "rgba(245,200,66,0.2)" : "#1E1E26"}`,
                  }}>
                  {isCombos && <Tag size={12} />}
                  {c}
                  {isCombos && activeCombos.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                      {activeCombos.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={() => fetchProducts()} className="btn-ghost py-2 px-3" title="Refresh" aria-label="Refresh products">
            <RefreshCw size={15} className={productsLoading ? "spin" : ""} aria-hidden="true" />
          </button>
        </div>

        {productsLoading ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: "#4A4A5A" }} role="status" aria-live="polite">
            <RefreshCw size={24} className="spin" aria-hidden="true" />
            <span className="sr-only">Loading products</span>
          </div>
        ) : (
          <div 
            ref={productGridRef}
            className="flex-1 overflow-y-auto"
            tabIndex={0}
            onKeyDown={handleProductGridKeyDown}
            onFocus={() => setIsGridFocused(true)}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, alignContent: "start", outline: "none" }}
            role="grid"
            aria-label={showCombos ? "Combo deals grid" : "Product grid"}
            aria-readonly="true"
          >
            {showCombos ? (
              activeCombos.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12" style={{ color: "#4A4A5A" }}>
                  <Tag size={48} className="mb-4 opacity-50" />
                  <p className="text-lg mb-2">No Active Combos</p>
                  <p className="text-sm">Create combo deals in Products menu</p>
                </div>
              ) : (
                activeCombos.map((combo, idx) => {
                  const totalItemsPrice = combo.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const isFocused = focusedProductIndex === idx;
                  return (
                    <button 
                      key={combo.id}
                      onClick={() => handleAddComboToCart(combo)}
                      ref={(el) => {
                        if (isFocused && el) {
                          el.focus();
                        }
                      }}
                      className="card card-hover p-3 text-left transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842]"
                      style={{ 
                        border: isFocused ? "2px solid #F5C842" : undefined 
                      }}
                      role="gridcell"
                      aria-label={`Combo: ${combo.name}, ${combo.items.length} items, ${curr}${combo.combo_price}`}
                    >
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                        {combo.discount_percent.toFixed(0)}% OFF
                      </div>
                      <div className="w-10 h-10 rounded-lg mb-2 flex items-center justify-center" style={{ background: "#F5C842" }} aria-hidden="true">
                        <Tag size={20} color="#0D0D0F" />
                      </div>
                      <div className="text-sm font-medium leading-tight mb-1">{combo.name}</div>
                      <div className="text-xs mb-2" style={{ color: "#4A4A5A" }}>
                        {combo.items.length} items
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold" style={{ color: "#2ECC71", fontSize: 16 }}>{curr}{combo.combo_price.toFixed(0)}</span>
                        <span className="text-xs line-through" style={{ color: "#4A4A5A" }}>{curr}{totalItemsPrice.toFixed(0)}</span>
                      </div>
                      <div className="mt-2 text-[10px]" style={{ color: "#9090A8" }}>
                        {combo.items.slice(0, 2).map((item, i) => (
                          <span key={i}>{item.quantity}x {item.product_name}{i < Math.min(combo.items.length, 2) - 1 ? ", " : ""}</span>
                        ))}
                        {combo.items.length > 2 && <span> +{combo.items.length - 2} more</span>}
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              filtered.map((p, idx) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const oos = p.stock === 0;
                const isFocused = focusedProductIndex === idx;
                return (
                  <button 
                    key={p.id} 
                    onClick={() => handleAddToCart(p)} 
                    disabled={oos}
                    ref={(el) => {
                      if (isFocused && el) {
                        el.focus();
                      }
                    }}
                    className="card card-hover p-3 text-left transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842]"
                    style={{ 
                      opacity: oos ? 0.4 : 1, 
                      border: inCart ? "1px solid rgba(245,200,66,0.3)" : isFocused ? "2px solid #F5C842" : undefined 
                    }}
                    role="gridcell"
                    aria-label={`${p.name}, ${p.category}, ${curr}${p.price}, Stock: ${p.stock}${inCart ? `, Quantity in cart: ${inCart.quantity}` : ''}${oos ? ', Out of stock' : ''}`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "#F5C842", color: "#0D0D0F" }} aria-hidden="true">{inCart.quantity}</div>
                    )}
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-16 rounded-lg mb-2 object-cover" style={{ background: "#1E1E26" }} />
                    ) : (
                      <div className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-lg font-bold"
                        style={{ background: "rgba(245,200,66,0.08)", color: "#F5C842" }} aria-hidden="true">{p.name[0]}</div>
                    )}
                    <div className="text-sm font-medium leading-tight mb-1">{p.name}</div>
                    <div className="text-xs" style={{ color: "#4A4A5A" }}>{p.category}</div>
                    <div className="mt-2 font-semibold" style={{ color: "#F5C842", fontSize: 14 }}>{curr}{p.price}</div>
                    <div style={{ color: "#4A4A5A", fontSize: 10 }}>Stock: {p.stock}</div>
                    {oos && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(13,13,15,0.7)", fontSize: 10, color: "#E74C3C" }} aria-hidden="true">OUT OF STOCK</div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="flex flex-col border-l border-border" style={{ width: 360 }} role="region" aria-label="Shopping cart">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-display font-bold text-lg" id="cart-title">Cart</span>
          <div className="flex gap-2 items-center">
            {cart.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(245,200,66,0.15)", color: "#F5C842" }}
                aria-label={`${itemCount} items in cart`}>
                {itemCount} items
              </span>
            )}
            {cart.length > 0 && (
              <button 
                onClick={handleClearCart} 
                className="p-1.5 rounded-lg"
                style={{ color: "#E74C3C", background: "rgba(231,76,60,0.1)" }}
                aria-label="Clear cart"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            )}
            <button 
              onClick={() => setShowHeldOrders(true)} 
              className="p-1.5 rounded-lg relative"
              style={{ color: "#F5C842", background: "rgba(245,200,66,0.1)" }}
              aria-label="View held orders"
            >
              <Clock size={14} aria-hidden="true" />
              {heldOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {heldOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="flex gap-2 mb-3" role="group" aria-label="Order type">
            <button
              onClick={() => setOrderType("dine_in")}
              aria-pressed={orderType === "dine_in"}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842] ${orderType === "dine_in" ? "bg-yellow-400 text-black" : "bg-[#1E1E26] text-gray-400"}`}
            >
              Dine In
            </button>
            <button
              onClick={() => setOrderType("takeaway")}
              aria-pressed={orderType === "takeaway"}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842] ${orderType === "takeaway" ? "bg-yellow-400 text-black" : "bg-[#1E1E26] text-gray-400"}`}
            >
              Takeaway
            </button>
            <button
              onClick={() => setOrderType("delivery")}
              aria-pressed={orderType === "delivery"}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842] ${orderType === "delivery" ? "bg-yellow-400 text-black" : "bg-[#1E1E26] text-gray-400"}`}
            >
              Delivery
            </button>
          </div>
          
          {orderType === "delivery" && (
            <div className="space-y-2 mb-3">
              <label htmlFor="delivery-address" className="sr-only">Delivery address</label>
              <input 
                id="delivery-address"
                placeholder="Delivery address" 
                value={customerInfo?.address || ""}
                onChange={(e) => {
                  setCustomerInfo({ ...customerInfo, address: e.target.value, name: customerInfo?.name || "", phone: customerInfo?.phone || "" } as any);
                  setErrors(prev => ({ ...prev, address: "" }));
                }}
                style={{ fontSize: 13, padding: "7px 12px" }} 
                className={errors.address ? "error" : ""}
              />
              {errors.address && <div className="text-xs px-1" style={{ color: "#E74C3C" }}>{errors.address}</div>}
              <label htmlFor="delivery-phone" className="sr-only">Phone number</label>
              <input 
                id="delivery-phone"
                placeholder="Phone number" 
                value={customerInfo?.phone || ""}
                onChange={(e) => {
                  setCustomerInfo({ ...customerInfo, phone: e.target.value, name: customerInfo?.name || "", address: customerInfo?.address || "" } as any);
                  setErrors(prev => ({ ...prev, phone: "" }));
                }}
                onBlur={(e) => lookupCustomerWallet(e.target.value)}
                style={{ fontSize: 13, padding: "7px 12px" }} 
                className={errors.phone ? "error" : ""}
              />
              {errors.phone && <div className="text-xs px-1" style={{ color: "#E74C3C" }}>{errors.phone}</div>}
            </div>
          )}
          
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} aria-hidden="true" />
            <label htmlFor="customer-name" className="sr-only">Customer name (optional)</label>
            <input 
              id="customer-name"
              placeholder="Customer name (optional)" 
              value={customerInfo?.name || ""}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value, phone: customerInfo?.phone || "", address: customerInfo?.address || "" } as any)}
              style={{ paddingLeft: 30, fontSize: 13, padding: "7px 12px 7px 30px" }} 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2" role="list" aria-label="Cart items">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: "#2A2A36" }} role="status">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <div className="mt-3 text-sm">Cart is empty</div>
            </div>
          )}
          {cart.map((item) => (
            <div key={item.product.id} className="card p-3 slide-in" role="listitem">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.product.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#4A4A5A" }}>
                    {curr}{item.product.price} × {item.quantity} = {curr}{(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
                <button 
                  onClick={() => useCartStore.getState().removeItem(item.product.id)} 
                  style={{ color: "#4A4A5A" }}
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: "1px solid #1E1E26" }} role="group" aria-label={`Quantity for ${item.product.name}`}>
                  <button 
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)} 
                    className="w-10 h-10 flex items-center justify-center touch-manipulation" 
                    style={{ color: "#9090A8" }}
                    aria-label={`Decrease quantity of ${item.product.name}`}
                  >
                    <Minus size={16} aria-hidden="true"/>
                  </button>
                  <span className="w-10 text-center text-base font-bold" aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)} 
                    className="w-10 h-10 flex items-center justify-center touch-manipulation" 
                    style={{ color: "#9090A8" }}
                    aria-label={`Increase quantity of ${item.product.name}`}
                  >
                    <Plus size={16} aria-hidden="true"/>
                  </button>
                </div>
                <label htmlFor={`discount-${item.product.id}`} className="sr-only">Discount percentage for {item.product.name}</label>
                <input 
                  id={`discount-${item.product.id}`}
                  type="number" 
                  placeholder="Disc %" 
                  value={item.discount || ""}
                  onChange={(e) => updateItemDiscount(item.product.id, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  style={{ fontSize: 12, padding: "4px 8px" }} 
                  min={0} 
                  max={100} 
                  aria-label="Discount percentage"
                />
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-border space-y-3" role="region" aria-label="Checkout">
            <div className="flex items-center gap-2">
              <label htmlFor="order-discount" className="text-sm" style={{ color: "#9090A8" }}>Order Discount</label>
              <input 
                id="order-discount"
                type="number" 
                placeholder="0" 
                value={globalDiscount || ""}
                onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                style={{ fontSize: 13, padding: "5px 8px" }} 
                min={0} 
                max={100} 
                aria-label="Order discount percentage"
              />
              <span className="text-sm" style={{ color: "#4A4A5A" }}>%</span>
            </div>

            {/* Coupon Code */}
            <div className="flex items-center gap-2">
              <Tag size={14} style={{ color: "#4A4A5A" }} />
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="flex-1"
                style={{ fontSize: 13, padding: "5px 8px" }}
                disabled={!!appliedCoupon}
                onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
              />
              {appliedCoupon ? (
                <button onClick={handleRemoveCoupon} className="btn-ghost py-1 px-2 text-xs" style={{ color: "#E74C3C" }}>Remove</button>
              ) : (
                <button onClick={handleApplyCoupon} className="btn-ghost py-1 px-2 text-xs" disabled={!couponCode.trim()}>Apply</button>
              )}
            </div>
            {couponError && <div className="text-xs" style={{ color: "#E74C3C" }}>{couponError}</div>}
            {appliedCoupon && <div className="text-xs" style={{ color: "#2ECC71" }}>✓ Coupon "{appliedCoupon.code}" applied ({appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `${curr}${appliedCoupon.discount_value}`})</div>}

            {/* Wallet */}
            {walletCustomerId && walletBalance > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={14} style={{ color: "#3498DB" }} />
                  <span className="text-sm" style={{ color: "#9090A8" }}>Wallet: {curr}{walletBalance.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setUseWallet(!useWallet)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: useWallet ? "#3498DB" : "#1E1E26",
                    border: "none", cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 9,
                    background: "#fff",
                    position: "relative",
                    left: useWallet ? 24 : 2,
                    transition: "left 0.2s",
                  }} />
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-sm" role="status" aria-live="polite">
              <div className="flex justify-between" style={{ color: "#9090A8" }}><span>Subtotal</span><span>{curr}{totals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between" style={{ color: "#9090A8" }}><span>Tax</span><span>+{curr}{totals.tax_amount.toFixed(2)}</span></div>
              {totals.discount_amount > 0 && <div className="flex justify-between" style={{ color: "#2ECC71" }}><span>Discount</span><span>−{curr}{totals.discount_amount.toFixed(2)}</span></div>}
              {couponDiscount > 0 && <div className="flex justify-between" style={{ color: "#2ECC71" }}><span>Coupon</span><span>−{curr}{couponDiscount.toFixed(2)}</span></div>}
              {walletDeduction > 0 && <div className="flex justify-between" style={{ color: "#3498DB" }}><span>Wallet</span><span>−{curr}{walletDeduction.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                <span>Total</span><span style={{ color: "#F5C842" }} aria-label={`Total amount: ${curr}${finalTotal.toFixed(2)}`}>{curr}{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2" role="group" aria-label="Payment method">
              {(["cash", "card", "upi"] as const).map((m) => {
                const icons = { cash: Banknote, card: CreditCard, upi: Smartphone };
                const Icon = icons[m];
                return (
                  <button 
                    key={m} 
                    onClick={() => setPaymentMethod(m)}
                    aria-pressed={paymentMethod === m}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842]"
                    style={{
                      background: paymentMethod === m ? "rgba(245,200,66,0.12)" : "#141418",
                      border: `1px solid ${paymentMethod === m ? "rgba(245,200,66,0.3)" : "#1E1E26"}`,
                      color: paymentMethod === m ? "#F5C842" : "#4A4A5A",
                    }}
                  >
                    <Icon size={16} aria-hidden="true" />{m}
                  </button>
                );
              })}
            </div>

             {paymentMethod === "cash" && (
               <div>
                 <div className="flex gap-2 mb-2 items-end">
                   <label htmlFor="amount-tendered" className="sr-only">Amount tendered</label>
                   <input 
                     id="amount-tendered"
                     type="number" 
                     placeholder={`Amount tendered (${curr})`} 
                     value={amountPaid}
                     onChange={(e) => {
                       setAmountPaid(parseFloat(e.target.value) || 0);
                       setErrors(prev => ({ ...prev, amount: "" }));
                     }} 
                     style={{ fontSize: 14, flex: 1 }} 
                     aria-describedby="change-display"
                     className={errors.amount ? "error" : ""}
                   />
                   <button 
                     onClick={() => setAmountPaid(totals.total)}
                     className="btn-ghost py-2 px-3"
                     aria-label="Copy total to amount tendered"
                   >
                     Copy Total
                   </button>
                 </div>

                 {errors.amount && <div className="text-xs px-1 mb-2" style={{ color: "#E74C3C" }}>{errors.amount}</div>}

                 {amountPaid >= totals.total && (
                   <div id="change-display" className="text-sm mt-1.5 font-semibold" style={{ color: "#2ECC71" }} role="status" aria-live="polite">
                     Change: {curr}{change.toFixed(2)}
                   </div>
                 )}
               </div>
             )}

            <div className="flex gap-2">
              {cart.length > 0 && (
                <>
                  <button 
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all"
                    style={{ 
                      background: "transparent", 
                      border: "1px solid #2E2E3E", 
                      color: "#9090A8" 
                    }}
                    onClick={handlePrintKOT}
                    disabled={processing}
                    aria-label="Print Kitchen Order Ticket"
                  >
                    <Printer size={14} />
                    KOT
                  </button>
                  <button 
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all"
                    style={{ 
                      background: "transparent", 
                      border: "1px solid #2E2E3E", 
                      color: "#9090A8" 
                    }}
                    onClick={handleHoldOrder}
                    disabled={processing}
                    aria-label="Hold order for later"
                  >
                    Hold
                  </button>
                </>
              )}
              <button 
                className="btn-accent flex-[2] flex items-center justify-center gap-2 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141418]"
                onClick={handleCheckout}
                disabled={processing || cart.length === 0 || (paymentMethod === "cash" && (amountPaid || 0) < finalTotal)}
                data-checkout-button
                aria-label={processing ? "Processing order..." : `Complete order - Charge ${curr}${finalTotal.toFixed(2)}`}
              >
                {processing ? <RefreshCw size={16} className="spin" aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                {processing ? "Processing..." : `Charge ${curr}${finalTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Held Orders Modal */}
       {showHeldOrders && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setShowHeldOrders(false)}
        >
           <div className="card p-6 w-[500px] max-h-[80vh] overflow-y-auto fade-in" role="dialog" aria-modal="true" aria-labelledby="held-orders-title">
             <div className="flex items-center justify-between mb-4">
               <h2 id="held-orders-title" className="font-display text-lg flex items-center gap-2" style={{ color: "#F5C842" }}>
                 <Clock size={20} /> Held Orders
               </h2>
               <button onClick={() => setShowHeldOrders(false)} className="btn-ghost py-1 px-3" aria-label="Close">
                 <X size={16} />
               </button>
             </div>

            {heldOrders.length === 0 ? (
              <div className="text-center py-8" style={{ color: "#4A4A5A" }}>
                <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p>No held orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {heldOrders.map((order, idx) => (
                  <div key={order.id} className="p-4 rounded-lg" style={{ background: "#1E1E26" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium">Order #{idx + 1}</span>
                        <span className="text-xs ml-2 px-2 py-0.5 rounded" style={{ background: "rgba(245,200,66,0.2)", color: "#F5C842" }}>
                          {order.order_type}
                        </span>
                      </div>
                      <span className="font-semibold" style={{ color: "#F5C842" }}>{curr}{order.total.toFixed(2)}</span>
                    </div>
                    <div className="text-sm mb-2" style={{ color: "#9090A8" }}>
                      {order.items.length} items • {new Date(order.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs mb-3" style={{ color: "#4A4A5A" }}>
                      {order.items.map(i => `${i.product_name}×${i.quantity}`).join(", ")}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestoreOrder(order)}
                        className="btn-accent flex-1 py-2 text-sm"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDeleteHeldOrder(order.id)}
                        className="btn-danger py-2 px-4 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
