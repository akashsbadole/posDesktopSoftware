"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Printer,
  ChevronRight,
  User,
  RefreshCw,
  Share,
  Mail,
  Save,
  MessageCircle,
  Clock,
  FolderOpen,
  Tag,
  Wallet,
  Package,
  QrCode,
  ShieldCheck,
  DollarSign,
  Split,
} from "lucide-react";
import { OrderType, PaymentMethod } from "@/lib/stores/cartStore";
import {
  dbSaveOrder,
  generateReceipt,
  dbGetHeldOrders,
  dbDeletePendingOrder,
  validateCoupon,
  useCoupon,
  getCustomerWallet,
  deductWalletBalance,
  dbGetCustomerByPhone,
  dbGetCustomerAddresses,
  Coupon,
  CustomerWallet,
  Combo,
  dbHoldOrder,
  openCashDrawer,
  printReceipt,
  openWhatsAppShare,
  openEmailShare,
  saveReceiptToFile,
  Product,
  Customer,
  CustomerAddress,
  sendSmsNotification,
  dbAddActivityLog,
  dbGetBatches,
  dbGetSerialNumbers,
  Batch,
  SerialNumber,
  ProductVariant,
} from "@/lib/db";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import {
  useCartStore,
  useProductsStore,
  useSettingsStore,
  useAuthStore,
  useCombosStore,
  useStoresStore,
  useTablesStore,
} from "@/lib/stores";
import { useGridNavigation } from "@/lib/keyboard";
import PinModal from "./PinModal";
import { getIndustryLabels } from "@/lib/industry";
import { v4 as uuid } from "uuid";
import { Order } from "@/lib/db";

export default function POSScreen() {
  const { activeStoreId } = useSettingsStore();
  const { stores } = useStoresStore();
  const activeStore = stores.find((s) => s.id === activeStoreId);
  const labels = getIndustryLabels(activeStore?.industry || "food");

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
    removeItem,
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
    toOrder,
    globalDiscountType,
    splitPayments,
    tipAmount,
    addCustomItem,
    overrideItemPrice,
    setSplitPayments,
    setTipAmount,
    priceTier,
    setPriceTier,
    tableId,
    setTable,
  } = useCartStore();

  const { tables, fetchTables } = useTablesStore();

  const {
    products,
    categories,
    isLoading: productsLoading,
    fetchProducts,
    getFilteredProducts,
    setSelectedCategory,
    setSearchQuery,
    selectedCategory,
    searchQuery,
    fetchVariants,
  } = useProductsStore();

  const { combos, fetchCombos, getActiveCombos } = useCombosStore();

  const { settings, fetchSettings } = useSettingsStore();
  const { user } = useAuthStore();

  const [receipt, setReceipt] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [processing, setProcessing] = useState(false);
  const [metadataPrompt, setMetadataPrompt] = useState<{
    productId: string;
    name: string;
    field: string;
  } | null>(null);
  const [metadataValue, setMetadataValue] = useState("");
  const [variantSelection, setVariantSelection] = useState<{
    product: Product;
    variants: ProductVariant[];
  } | null>(null);
  const [batchSelection, setBatchSelection] = useState<{
    product: Product;
    batches: Batch[];
  } | null>(null);
  const [serialSelection, setSerialSelection] = useState<{
    product: Product;
    serials: SerialNumber[];
  } | null>(null);
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);
  const [isGridFocused, setIsGridFocused] = useState(false);
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showPinModal, setShowPinModal] = useState<{
    type: "price_override" | "void" | "no_sale";
    productId?: string;
  } | null>(null);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [customItem, setCustomItem] = useState({ name: "", price: "" });
  const [overridePrice, setOverridePrice] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [showVoidReasonModal, setShowVoidReasonModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const productGridRef = useRef<HTMLDivElement>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletCustomerId, setWalletCustomerId] = useState<string | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>(
    [],
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchSettings();
    loadHeldOrders();
    fetchCombos();
    fetchTables();
  }, [activeStoreId]);

  const loadHeldOrders = async () => {
    const h = await dbGetHeldOrders(activeStoreId);
    setHeldOrders(h);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "c" || e.key === "C") {
        if (cart.length > 0) {
          clearCart();
        }
      }
      if (e.key === "p" || e.key === "P") {
        const checkoutBtn = document.querySelector(
          "[data-checkout-button]",
        ) as HTMLButtonElement;
        if (checkoutBtn && !checkoutBtn.disabled) {
          checkoutBtn.click();
        }
      }
      if (e.key === "f" || e.key === "F" || e.key === "/") {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchQuery("");
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

  const getNewIndex = useGridNavigation(
    filtered.length,
    () => {},
    getGridColumns(),
  );

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

  const handleAddItem = async (product: Product) => {
    if (product.stock <= 0 && !product.is_digital) return;

    // 1. Check for variants
    const productVariants = await fetchVariants(product.id);
    if (productVariants && productVariants.length > 0) {
      setVariantSelection({ product, variants: productVariants });
      return;
    }

    // 2. Check serial tracking first (user must provide serial before adding)
    if (product.metadata?.track_serial) {
      setMetadataPrompt({
        productId: product.id,
        name: product.name,
        field: "Serial Number",
      });
      setMetadataValue("");
      return;
    }

    // 3. Check for batches (choose batch before adding)
    if (product.metadata?.track_batch) {
      try {
        const batches = await dbGetBatches(product.id, activeStoreId);
        const availableBatches = batches.filter((b) => b.quantity > 0);
        if (availableBatches.length > 0) {
          setBatchSelection({ product, batches: availableBatches });
          return;
        } else if (!product.is_digital) {
          alert("No available batches for this product.");
          return;
        }
      } catch (err) {
        console.error("Failed to fetch batches:", err);
      }
    }

    addItem(product);
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    if (!variantSelection) return;
    const { product } = variantSelection;
    const variantProduct: Product = {
      ...product,
      price: variant.price,
      sku: variant.sku || product.sku,
      name: `${product.name} (${variant.name}: ${variant.value})`,
      metadata: { ...product.metadata, variant_id: variant.id },
    };
    addItem(variantProduct);
    setVariantSelection(null);
  };

  const handleSelectBatch = (batch: Batch) => {
    if (!batchSelection) return;
    const { product } = batchSelection;
    const batchProduct: Product = {
      ...product,
      name: `${product.name} (Batch: ${batch.batch_number})`,
      metadata: {
        ...product.metadata,
        batch_id: batch.id,
        batch_number: batch.batch_number,
      },
    };
    addItem(batchProduct);
    setBatchSelection(null);
  };

  const handleSelectSerial = (serial: SerialNumber) => {
    if (!serialSelection) return;
    const { product } = serialSelection;
    const serialProduct: Product = {
      ...product,
      name: `${product.name} (S/N: ${serial.serial_number})`,
      metadata: {
        ...product.metadata,
        serial_number_id: serial.id,
        serial_number: serial.serial_number,
      },
    };
    // For serial numbers, we usually want one per line item
    addItem(serialProduct, 1);
    setSerialSelection(null);
  };

  const handleMetadataSubmit = () => {
    if (!metadataPrompt) return;
    const p = products.find((x) => x.id === metadataPrompt.productId);
    if (p) {
      addItem({
        ...p,
        metadata: { ...p.metadata, serial_number: metadataValue },
      });
    }
    setMetadataPrompt(null);
    setMetadataValue("");
  };

  const handleAddComboToCart = (combo: Combo) => {
    // Calculate total price of individual items
    const totalIndividualPrice = combo.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Calculate global discount percentage needed to reach combo price
    // Formula: (Individual - Combo) / Individual * 100
    const discountPercent =
      totalIndividualPrice > 0
        ? ((totalIndividualPrice - combo.combo_price) / totalIndividualPrice) *
          100
        : 0;

    combo.items.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (product) {
        // We add the item and then immediately update its discount to match the combo pricing
        // This is a bit tricky since addItem is async-ish (state update)
        // Better: Use a version of addItem that accepts a discount
        const comboProduct = {
          ...product,
          metadata: {
            ...product.metadata,
            from_combo: combo.id,
            combo_name: combo.name,
          },
        };

        // We need to use a slightly different approach since we want to apply the discount
        // I'll add a helper to cartStore or just do it manually here if possible
        // For now, I'll just add the product. The user can see it's from a combo.

        // To ensure the price is correct, we can temporarily override the product price
        // or apply the discount. Applying discount is cleaner.

        for (let i = 0; i < item.quantity; i++) {
          // Create a "virtual" product with the discounted price
          const discountedPrice = item.price * (1 - discountPercent / 100);
          const virtualProduct: Product = {
            ...product,
            price: discountedPrice,
            name: `${product.name} (${combo.name})`,
            metadata: {
              ...product.metadata,
              from_combo: combo.id,
              original_price: item.price,
            },
          };
          addItem(virtualProduct);
        }
      }
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const coupon = await validateCoupon(
        couponCode.trim(),
        getSubtotal(),
        activeStoreId,
      );
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

  const lookupCustomerData = async (phone: string) => {
    if (!phone || phone.length < 7) {
      setActiveCustomer(null);
      setWalletBalance(0);
      setWalletCustomerId(null);
      setCustomerAddresses([]);
      return;
    }
    try {
      const customer = await dbGetCustomerByPhone(phone, activeStoreId);
      if (customer) {
        setActiveCustomer(customer);
        setCustomerInfo({
          name: customer.name,
          phone: customer.phone,
          address: customerInfo?.address,
        });

        const [wallet, addrs] = await Promise.all([
          getCustomerWallet(customer.id),
          dbGetCustomerAddresses(customer.id),
        ]);
        setWalletBalance(wallet.balance);
        setWalletCustomerId(customer.id);
        setCustomerAddresses(addrs);

        // Apply price tier logic if applicable
        if (customer.price_tier === "discount") {
          setGlobalDiscount(10, "percentage");
        } else if (customer.price_tier === "wholesale") {
          setGlobalDiscount(15, "percentage");
        } else if (customer.price_tier === "premium") {
          setGlobalDiscount(-10, "percentage");
        }
      } else {
        setActiveCustomer(null);
        setWalletBalance(0);
        setWalletCustomerId(null);
        setCustomerAddresses([]);
      }
    } catch (error) {
      console.error("Failed to lookup customer:", error);
      alert("Failed to lookup customer by phone number");
      setActiveCustomer(null);
      setWalletBalance(0);
      setWalletCustomerId(null);
      setCustomerAddresses([]);
    }
  };

  const rawTotal = getTotal();
  const rawSettings = useSettingsStore.getState().settings;
  const displayTotal = rawSettings.enable_round_off
    ? Math.round(rawTotal)
    : rawTotal;
  const roundingOff = rawSettings.enable_round_off
    ? Math.round(rawTotal) - rawTotal
    : 0;

  const totals = {
    subtotal: getSubtotal(),
    tax_amount: getTaxAmount(),
    discount_amount: getDiscountAmount(),
    total: rawTotal,
    displayTotal,
    rounding_off: roundingOff,
  };

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? totals.subtotal * (appliedCoupon.discount_value / 100)
      : appliedCoupon.discount_value
    : 0;

  const walletDeduction =
    useWallet && walletCustomerId
      ? Math.min(walletBalance, rawTotal - couponDiscount)
      : 0;

  const finalPayable = rawTotal - couponDiscount - walletDeduction;
  const finalTotal = rawSettings.enable_round_off
    ? Math.round(finalPayable)
    : finalPayable;

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

    if (paymentMethod === "split") {
      const splitTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(splitTotal - finalTotal) > 0.01) {
        newErrors.split = `Split total (${curr}${splitTotal}) does not match order total (${curr}${finalTotal.toFixed(2)})`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setProcessing(true);

    const orderId = originalOrderId || uuid();
    const order = toOrder(
      orderId,
      user?.id || "system",
      user?.name || "System",
    );
    order.payment_method = paymentMethod === "split" ? "card" : paymentMethod;
    order.amount_paid = paymentMethod === "cash" ? amountPaid || 0 : finalTotal;
    order.change_amount = paymentMethod === "cash" ? change : 0;
    order.customer_name = customerInfo?.name || "";
    order.delivery_status = orderType === "delivery" ? "pending" : "delivered";
    order.delivery_address = customerInfo?.address || "";
    order.delivery_phone = customerInfo?.phone || "";
    order.discount_amount =
      totals.discount_amount + couponDiscount + walletDeduction;
    order.total = finalTotal;

    try {
      await dbSaveOrder(order, activeStoreId);

      if (appliedCoupon) {
        try {
          await useCoupon(appliedCoupon.code, activeStoreId);
        } catch (e) {
          console.error("Failed to mark coupon used:", e);
        }
      }
      if (useWallet && walletCustomerId && walletDeduction > 0) {
        try {
          await deductWalletBalance(
            walletCustomerId,
            walletDeduction,
            order.id,
          );
          // Refresh wallet balance after deduction
          const updatedWallet = await getCustomerWallet(walletCustomerId);
          setWalletBalance(updatedWallet.balance);
        } catch (e) {
          console.error("Failed to deduct wallet:", e);
        }
      }

      try {
        await openCashDrawer();
      } catch (e) {
        console.log("Cash drawer not available");
      }

      const rec = generateReceipt(order, settings);
      setReceipt(rec);
      setLastOrder(order);
      clearCart();
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError("");
      setUseWallet(false);
      setWalletBalance(0);
      setWalletCustomerId(null);
      setTipAmount(0);
      setSplitPayments([]);
      setActiveCustomer(null);
      setCustomerAddresses([]);
      setSelectedAddressId(null);
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
      await dbHoldOrder(order, activeStoreId);
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
      const kotText = generateKOTText(order);
      await printReceipt(kotText);
      await dbSaveOrder(order, activeStoreId);
      alert("KOT sent to printer!");
      clearCart();
    } catch (err) {
      console.error("Failed to print KOT:", err);
      alert("Failed to print KOT - Order not saved");
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
      ...order.items.map(
        (item, idx) => `${idx + 1}. ${item.product_name} x${item.quantity}`,
      ),
      "-".repeat(32),
      notes ? `Notes: ${notes}` : "",
      "=".repeat(32),
      "",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleRestoreOrder = (order: Order) => {
    const restoredCart = order.items
      .map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        if (product) {
          return {
            product,
            quantity: item.quantity,
            discount: item.discount,
          };
        }
        return null;
      })
      .filter(
        (
          item,
        ): item is {
          product: (typeof products)[0];
          quantity: number;
          discount: number;
        } => item !== null,
      );

    if (restoredCart.length > 0) {
      restoredCart.forEach((item) => {
        for (let i = 0; i < item.quantity; i++) {
          addItem(item.product);
        }
      });
      setCustomerInfo({
        name: order.customer_name,
        phone: order.delivery_phone,
        address: order.delivery_address,
      });
      setOrderType(order.order_type as "dine_in" | "takeaway" | "delivery");
      if (order.table_id) {
        const table = tables.find((t) => t.id === order.table_id);
        setTable(order.table_id, table?.name || order.table_id);
      }
      setShowHeldOrders(false);
    }
  };

  const handleDeleteHeldOrder = async (id: string) => {
    if (!confirm("Delete this held order?")) return;
    try {
      await dbDeletePendingOrder(id, activeStoreId);
      await loadHeldOrders();
    } catch (err) {
      console.error("Failed to delete held order:", err);
    }
  };

  const curr = settings?.currency_symbol ?? "₹";

  const handlePrint = () => {
    if (!receipt) return;
    // Final foolproof delay of 3s for guaranteed device/driver stabilization
    setTimeout(() => {
      window.print();
    }, 3000);
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
      window.open(
        `mailto:?subject=${encodeURIComponent(subject)}&body=${encoded}`,
        "_blank",
      );
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

  const handleRemoveItem = (cartItemId: string) =>
    useCartStore.getState().removeItem(cartItemId);
  const handleClearCart = () => {
    if (cart.length === 0) return;
    setShowVoidReasonModal(true);
  };

  const handleVoidOrder = async () => {
    if (!voidReason.trim()) return;
    setShowPinModal({ type: "void" });
  };

  const handleNoSale = async () => {
    setShowPinModal({ type: "no_sale" });
  };

  const itemCount = getItemCount();

  const isUnpaid =
    lastOrder &&
    (lastOrder.status === "hold" ||
      lastOrder.status === "pending" ||
      lastOrder.status === "processing");
  const isIndia =
    settings.country === "IN" ||
    settings.country === "India" ||
    settings.currency_symbol === "₹" ||
    settings.currency === "INR";
  const totalToPayValue = isIndia
    ? Math.round(lastOrder?.total || 0)
    : lastOrder?.total || 0;
  const currValue = settings.currency_symbol || (isIndia ? "₹" : "$");
  const upiUrlValue =
    isIndia && settings.upi_id
      ? `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.store_name)}&am=${totalToPayValue.toFixed(2)}&cu=INR`
      : null;

  useEffect(() => {
    if (upiUrlValue && qrRef.current) {
      // Robust capture delay of 1.5s to ensure HD paint cycle is complete
      const timer = setTimeout(() => {
        const canvas = qrRef.current?.querySelector("canvas");
        if (canvas) {
          try {
            setQrBase64(canvas.toDataURL("image/png", 1.0));
          } catch (e) {
            console.error("Failed to capture QR as image:", e);
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setQrBase64(null);
    }
  }, [upiUrlValue, receipt]);

  if (processing) {
    // keep processing early return if needed, but receipt should be a modal
  }

  const allCategories = ["All", "Combos", ...categories];
  const activeCombos = getActiveCombos();
  const showCombos = selectedCategory === "Combos";

  return (
    <>
      {receipt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm no-print"
          role="region"
          aria-label="Order complete"
        >
          <div
            className="card p-6 w-[450px] animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="receipt-title"
                className="font-display text-base"
                style={{ color: "#F5C842" }}
              >
                {isUnpaid ? "Payment Request" : "Order Complete!"}
              </h2>
              <button
                onClick={() => {
                  setReceipt(null);
                  setLastOrder(null);
                }}
                className="btn-ghost py-1 px-3"
                aria-label="Close and start new order"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="flex gap-4">
              <div
                className="flex-1 text-xs font-mono p-4 rounded-lg overflow-auto"
                style={{
                  background: "#0A0A0C",
                  color: "#9090A8",
                  maxHeight: 400,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
                aria-label="Receipt content"
                role="region"
              >
                {receipt.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith("[LOGO: ") && trimmed.endsWith("]")) {
                    const path = trimmed.slice(7, -1).trim();
                    let imgSrc = "";
                    try {
                      imgSrc =
                        typeof window !== "undefined" &&
                        (window as unknown as { __TAURI_METADATA__: unknown })
                          .__TAURI_METADATA__
                          ? convertFileSrc(path)
                          : path;
                    } catch (e) {}

                    return (
                      <div key={i} className="flex justify-center mb-6">
                        <img
                          src={imgSrc}
                          alt="Logo"
                          className="max-h-24 object-contain shadow-sm"
                        />
                      </div>
                    );
                  }
                  if (
                    trimmed.startsWith("[QRCODE: ") &&
                    trimmed.endsWith("]")
                  ) {
                    const url = trimmed.slice(9, -1).trim();
                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-3 p-4 bg-[#141418] rounded-xl border border-border my-4"
                      >
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                          Scan to Pay UPI
                        </div>
                        <div className="p-3 bg-white rounded-xl">
                          <QRCodeSVG value={url} size={150} />
                        </div>
                        <div className="text-xs font-bold text-[#F5C842]">
                          {settings.upi_id}
                        </div>
                      </div>
                    );
                  }
                  return <div key={i}>{line || "\u00A0"}</div>;
                })}
              </div>

              {upiUrlValue && (
                <div className="no-print w-40 flex flex-col items-center gap-3 p-3 rounded-lg border border-border bg-[#141418]">
                  <div className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-wider">
                    Scan to Pay UPI
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <QRCodeSVG value={upiUrlValue} size={120} />
                  </div>
                  <div className="text-xs font-bold text-[#F5C842]">
                    {currValue}
                    {lastOrder?.total.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-gray-500 text-center truncate w-full">
                    {settings.upi_id}
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex gap-2 mt-4"
              role="group"
              aria-label="Receipt actions"
            >
              <button
                className="btn-accent flex-1 flex items-center justify-center gap py"
                onClick={() => {
                  setReceipt(null);
                  setLastOrder(null);
                }}
              >
                <Plus size={14} aria-hidden="true" /> New Order
              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={handlePrint}
                aria-label="Print receipt"
              >
                <Printer size={16} aria-hidden="true" />
              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={handleWhatsAppShare}
                aria-label="Share receipt on WhatsApp"
              >
                <MessageCircle size={16} aria-hidden="true" />
              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={handleEmailShare}
                aria-label="Share receipt via email"
              >
                <Mail size={16} aria-hidden="true" />
              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={handleSaveReceipt}
                aria-label="Save receipt to file"
              >
                <Save size={16} aria-hidden="true" />
              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={async () => {
                  if (lastOrder?.delivery_phone) {
                    try {
                      await sendSmsNotification(
                        lastOrder.delivery_phone,
                        receipt,
                        activeStoreId,
                      );
                      alert("SMS sent!");
                    } catch (e) {
                      alert("Failed to send SMS");
                    }
                  } else {
                    alert("No phone number found for this order");
                  }
                }}
                aria-label="Share receipt via SMS"
              >
                <Smartphone size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="flex h-full overflow-hidden no-print"
        id="main-content"
        role="main"
        aria-label="POS Screen"
      >
        {/* Product Grid */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <div
            className="flex gap-3 mb-4"
            role="search"
            aria-label="Product search"
          >
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "#4A4A5A" }}
                aria-hidden="true"
              />
              <label htmlFor="product-search" className="sr-only">
                Search or scan barcode
              </label>
              <input
                id="product-search"
                ref={searchInputRef}
                placeholder="Search or scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{ paddingLeft: 36 }}
                aria-describedby="search-hint"
              />
              <span id="search-hint" className="sr-only">
                Press Enter to search by barcode, Escape to clear
              </span>
            </div>
            <div
              className="flex gap-1"
              role="group"
              aria-label="Filter by category"
            >
              <button
                onClick={() => setShowCustomItemModal(true)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all bg-[#141418] text-[#F5C842] border border-[#1E1E26] hover:bg-[#1E1E26] flex items-center gap-1"
                aria-label="Add custom item"
              >
                <Plus size={12} /> Custom
              </button>
              {allCategories.map((c) => {
                const isSelected =
                  c === "All" ? !selectedCategory : selectedCategory === c;
                const isCombos = c === "Combos";
                return (
                  <button
                    key={c}
                    onClick={() =>
                      setSelectedCategory(
                        c === "All" ? null : c === "Combos" ? "Combos" : c,
                      )
                    }
                    aria-pressed={isSelected}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842] flex items-center gap-1"
                    style={{
                      background: isSelected
                        ? "rgba(245,200,66,0.1)"
                        : "#141418",
                      color: isSelected ? "#F5C842" : "#4A4A5A",
                      border: `1px solid ${isSelected ? "rgba(245,200,66,0.2)" : "#1E1E26"}`,
                    }}
                  >
                    {isCombos && <Tag size={12} />}
                    {c}
                    {isCombos && activeCombos.length > 0 && (
                      <span
                        className="ml-1 px-1.5 py-0.5 rounded text-[10px]"
                        style={{ background: "#2ECC71", color: "#0D0D0F" }}
                      >
                        {activeCombos.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => fetchProducts()}
              className="btn-ghost py-2 px-3"
              title="Refresh"
              aria-label="Refresh products"
            >
              <RefreshCw
                size={15}
                className={productsLoading ? "spin" : ""}
                aria-hidden="true"
              />
            </button>
          </div>

          {productsLoading ? (
            <div
              className="flex-1 flex items-center justify-center"
              style={{ color: "#4A4A5A" }}
              role="status"
              aria-live="polite"
            >
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
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                gap: 12,
                alignContent: "start",
                outline: "none",
              }}
              role="grid"
              aria-label={showCombos ? "Combo deals grid" : "Product grid"}
              aria-readonly="true"
            >
              {showCombos ? (
                activeCombos.length === 0 ? (
                  <div
                    className="col-span-full flex flex-col items-center justify-center py-12"
                    style={{ color: "#4A4A5A" }}
                  >
                    <Tag size={48} className="mb-4 opacity-50" />
                    <p className="text-base mb-2">No Active Combos</p>
                    <p className="text-sm">
                      Create combo deals in Products menu
                    </p>
                  </div>
                ) : (
                  activeCombos.map((combo, idx) => {
                    const totalItemsPrice = combo.items.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0,
                    );
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
                          border: isFocused ? "2px solid #F5C842" : undefined,
                        }}
                        role="gridcell"
                        aria-label={`Combo: ${combo.name}, ${combo.items.length} items, ${curr}${combo.combo_price}`}
                      >
                        <div
                          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ background: "#2ECC71", color: "#0D0D0F" }}
                        >
                          {combo.discount_percent.toFixed(0)}% OFF
                        </div>
                        <div
                          className="w-10 h-10 rounded-lg mb-2 flex items-center justify-center"
                          style={{ background: "#F5C842" }}
                          aria-hidden="true"
                        >
                          <Tag size={20} color="#0D0D0F" />
                        </div>
                        <div className="text-sm font-medium leading-tight mb-1">
                          {combo.name}
                        </div>
                        <div
                          className="text-xs mb-2"
                          style={{ color: "#4A4A5A" }}
                        >
                          {combo.items.length} items
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span
                            className="font-bold"
                            style={{ color: "#2ECC71", fontSize: 16 }}
                          >
                            {curr}
                            {combo.combo_price.toFixed(0)}
                          </span>
                          <span
                            className="text-xs line-through"
                            style={{ color: "#4A4A5A" }}
                          >
                            {curr}
                            {totalItemsPrice.toFixed(0)}
                          </span>
                        </div>
                        <div
                          className="mt-2 text-[10px]"
                          style={{ color: "#9090A8" }}
                        >
                          {combo.items.slice(0, 2).map((item, i) => (
                            <span key={i}>
                              {item.quantity}x {item.product_name}
                              {i < Math.min(combo.items.length, 2) - 1
                                ? ", "
                                : ""}
                            </span>
                          ))}
                          {combo.items.length > 2 && (
                            <span> +{combo.items.length - 2} more</span>
                          )}
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
                      onClick={() => handleAddItem(p)}
                      disabled={oos}
                      ref={(el) => {
                        if (isFocused && el) {
                          el.focus();
                        }
                      }}
                      className="card card-hover p-3 text-left transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842]"
                      style={{
                        opacity: oos ? 0.4 : 1,
                        border: inCart
                          ? "1px solid rgba(245,200,66,0.3)"
                          : isFocused
                            ? "2px solid #F5C842"
                            : undefined,
                      }}
                      role="gridcell"
                      aria-label={`${p.name}, ${p.category}, ${curr}${p.price}, Stock: ${p.stock}${inCart ? `, Quantity in cart: ${inCart.quantity}` : ""}${oos ? ", Out of stock" : ""}`}
                    >
                      {inCart && (
                        <div
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: "#F5C842", color: "#0D0D0F" }}
                          aria-hidden="true"
                        >
                          {inCart.quantity}
                        </div>
                      )}
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-16 rounded-lg mb-2 object-cover"
                          style={{ background: "#1E1E26" }}
                        />
                      ) : (
                        <div
                          className="w-full h-16 rounded-lg mb-2 flex items-center justify-center text-base font-semibold"
                          style={{
                            background: "rgba(245,200,66,0.08)",
                            color: "#F5C842",
                          }}
                          aria-hidden="true"
                        >
                          {p.name[0]}
                        </div>
                      )}
                      <div className="text-sm font-medium leading-tight mb-1">
                        {p.name}
                      </div>
                      <div className="text-xs" style={{ color: "#4A4A5A" }}>
                        {p.category}
                      </div>
                      <div
                        className="mt-2 font-semibold"
                        style={{ color: "#F5C842", fontSize: 14 }}
                      >
                        {curr}
                        {p.price}
                      </div>
                      <div style={{ color: "#4A4A5A", fontSize: 10 }}>
                        Stock: {p.stock}
                      </div>
                      {oos && (
                        <div
                          className="absolute inset-0 flex items-center justify-center rounded-xl"
                          style={{
                            background: "rgba(13,13,15,0.7)",
                            fontSize: 10,
                            color: "#E74C3C",
                          }}
                          aria-hidden="true"
                        >
                          OUT OF STOCK
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Cart */}
        <div
          className="flex flex-col border-l border-border"
          style={{ width: 360 }}
          role="region"
          aria-label="Shopping cart"
        >
          <div className="p-3 border-b border-border bg-[#0D0D0F]/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm uppercase tracking-tight text-[#F5C842]">
                  Cart ({itemCount})
                </span>
                <div
                  className="flex bg-[#141418] rounded-md p-0.5 border border-[#1E1E26]"
                  role="group"
                  aria-label="Price Tier"
                >
                  <button
                    onClick={() => setPriceTier("retail")}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all ${priceTier === "retail" ? "bg-[#F5C842] text-[#0D0D0F]" : "text-[#4A4A5A]"}`}
                  >
                    RETAIL
                  </button>
                  <button
                    onClick={() => setPriceTier("wholesale")}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all ${priceTier === "wholesale" ? "bg-[#F5C842] text-[#0D0D0F]" : "text-[#4A4A5A]"}`}
                  >
                    WHOL.
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={handleNoSale}
                  className="p-1.5 rounded-lg text-[#2ECC71] bg-green-500/5 border border-green-500/10 hover:bg-green-500/10"
                  title="Open Drawer"
                >
                  <Banknote size={14} />
                </button>
                <button
                  onClick={handleClearCart}
                  className="p-1.5 rounded-lg text-[#E74C3C] bg-red-500/5 border border-red-500/10 hover:bg-red-500/10"
                  title="Clear Cart"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setShowHeldOrders(true)}
                  className="p-1.5 rounded-lg text-[#F5C842] bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-500/10 relative"
                >
                  <Clock size={14} />
                  {heldOrders.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center border-2 border-[#0D0D0F]">
                      {heldOrders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-1" role="group" aria-label="Order type">
              {[
                { id: "dine_in", label: labels.dine_in },
                {
                  id: "takeaway",
                  label: labels.takeaway.split("/")[1] || "Takeaway",
                },
                { id: "delivery", label: "Delivery" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setOrderType(type.id as OrderType)}
                  className={`flex-1 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${orderType === type.id ? "bg-[#F5C842] border-[#F5C842] text-[#0D0D0F]" : "bg-[#141418] border-[#1E1E26] text-[#4A4A5A] hover:border-[#F5C842]/50"}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pt-2">
            <div className="grid grid-cols-2 gap-1 border border-[#1E1E26] rounded-sm p-1.5 bg-[#141418]/30 mb-1.5">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold text-[#4A4A5A] leading-none mb-1">
                  Table
                </span>
                <button
                  onClick={() => setShowTableModal(true)}
                  data-testid="select-table-btn"
                  className="text-[10px] font-bold text-white flex items-center justify-between hover:text-[#F5C842] transition-colors"
                >
                  <span className="truncate">{tableName || "No Table"}</span>
                  <span className="text-[8px] text-[#F5C842] uppercase ml-1">
                    (Edit)
                  </span>
                </button>
              </div>
              <div className="flex flex-col border-l border-[#1E1E26] pl-1.5">
                <span className="text-[8px] uppercase font-bold text-[#4A4A5A] leading-none mb-1">
                  Customer
                </span>
                <button
                  onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                  data-testid="edit-customer-btn"
                  className="text-[10px] font-bold text-white flex items-center justify-between hover:text-[#F5C842] transition-colors"
                >
                  <span className="truncate">
                    {customerInfo?.name || activeCustomer?.name || "Walk-in"}
                  </span>
                  <span className="text-[8px] text-[#F5C842] uppercase ml-1">
                    (Edit)
                  </span>
                </button>
              </div>
            </div>

            {isEditingCustomer && (
              <div className="space-y-2 mb-3 p-2 bg-[#141418] rounded-lg border border-[#1E1E26] slide-in">
                <div className="relative">
                  <User
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4A4A5A]"
                  />
                  <input
                    placeholder="Customer Name"
                    value={customerInfo?.name || ""}
                    onChange={(e) =>
                      setCustomerInfo({
                        name: e.target.value,
                        phone: customerInfo?.phone || "",
                        address: customerInfo?.address,
                      })
                    }
                    className="text-[11px] pl-8 py-1.5 w-full bg-[#0D0D0F]"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    placeholder="Phone"
                    value={customerInfo?.phone || ""}
                    onChange={(e) => {
                      setCustomerInfo({
                        name: customerInfo?.name || "",
                        phone: e.target.value,
                        address: customerInfo?.address,
                      });
                      lookupCustomerData(e.target.value);
                    }}
                    className="text-[11px] py-1.5 flex-1 bg-[#0D0D0F]"
                  />
                  <input
                    placeholder="Address"
                    value={customerInfo?.address || ""}
                    onChange={(e) =>
                      setCustomerInfo({
                        name: customerInfo?.name || "",
                        phone: customerInfo?.phone || "",
                        address: e.target.value,
                      })
                    }
                    className="text-[11px] py-1.5 flex-1 bg-[#0D0D0F]"
                  />
                </div>
                {customerAddresses.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto py-1">
                    {customerAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() =>
                          setCustomerInfo({
                            name: customerInfo?.name || "",
                            phone: customerInfo?.phone || "",
                            address: addr.address,
                          })
                        }
                        className="flex-shrink-0 px-2 py-1 rounded bg-[#1E1E26] text-[9px] border border-transparent hover:border-[#F5C842]"
                      >
                        {addr.label}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setIsEditingCustomer(false)}
                  className="w-full py-1 text-[9px] font-bold uppercase bg-[#1E1E26] text-[#4A4A5A] rounded hover:text-white"
                >
                  Close Editor
                </button>
              </div>
            )}
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-2"
            role="list"
            aria-label="Cart items"
          >
            {cart.length === 0 && (
              <div
                className="flex flex-col items-center justify-center h-full"
                style={{ color: "#2A2A36" }}
                role="status"
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <div className="mt-3 text-sm">Cart is empty</div>
              </div>
            )}
            {cart.map((item) => {
              const currentPrice =
                item.override_price !== undefined
                  ? item.override_price
                  : item.product.price;
              return (
                <div
                  key={item.cartItemId}
                  className="flex items-center gap-1.5 py-1 border-b border-white/5 slide-in"
                  role="listitem"
                >
                  <div className="flex items-center bg-[#1E1E26] rounded-sm overflow-hidden shrink-0 h-6">
                    <button
                      onClick={() =>
                        updateQuantity(item.cartItemId, item.quantity - 1)
                      }
                      className="px-1 h-full hover:bg-[#F5C842] hover:text-[#0D0D0F] transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus size={8} />
                    </button>
                    <span className="w-5 text-center text-[9px] font-bold leading-none">
                      {item.quantity}x
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.cartItemId, item.quantity + 1)
                      }
                      className="px-1 h-full hover:bg-[#F5C842] hover:text-[#0D0D0F] transition-colors"
                      aria-label="Increase"
                    >
                      <Plus size={8} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold truncate leading-tight uppercase text-gray-200">
                      {item.product.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        setShowPinModal({
                          type: "price_override",
                          productId: item.cartItemId,
                        })
                      }
                      className="text-[10px] font-bold text-[#F5C842] tabular-nums"
                    >
                      {curr}
                      {currentPrice.toFixed(2)}
                    </button>
                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      className="text-[#4A4A5A] hover:text-[#E74C3C]"
                      aria-label="Remove"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {cart.length > 0 && (
            <div className="p-1.5 border-t border-border bg-[#0D0D0F]/30 space-y-1.5">
              <div className="flex gap-1 items-center">
                <div className="flex-1 flex items-center bg-[#141418] rounded-sm border border-[#1E1E26] px-1 py-0.5">
                  <span className="text-[8px] uppercase font-bold text-[#4A4A5A] mr-1">
                    Disc
                  </span>
                  <input
                    type="number"
                    value={globalDiscount || ""}
                    onChange={(e) =>
                      setGlobalDiscount(parseFloat(e.target.value) || 0)
                    }
                    className="w-6 bg-transparent border-none text-[10px] p-0 h-4"
                    placeholder="0"
                  />
                  <button
                    onClick={() =>
                      setGlobalDiscount(
                        globalDiscount,
                        globalDiscountType === "percentage"
                          ? "fixed"
                          : "percentage",
                      )
                    }
                    className="text-[8px] font-bold text-[#F5C842] ml-0.5"
                  >
                    {globalDiscountType === "percentage" ? "%" : curr}
                  </button>
                </div>
                <div className="flex-1 flex items-center bg-[#141418] rounded-sm border border-[#1E1E26] px-1 py-0.5">
                  <span className="text-[8px] uppercase font-bold text-[#4A4A5A] mr-1">
                    Tip
                  </span>
                  <input
                    type="number"
                    value={tipAmount || ""}
                    onChange={(e) =>
                      setTipAmount(parseFloat(e.target.value) || 0)
                    }
                    className="flex-1 bg-transparent border-none text-[10px] p-0 h-4"
                    placeholder="0"
                  />
                </div>
                <div className="flex-[2] flex items-center bg-[#141418] rounded-sm border border-[#1E1E26] px-1 py-0.5">
                  <Tag size={8} className="text-[#4A4A5A] mr-1" />
                  <input
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder="Coupon"
                    className="flex-1 bg-transparent border-none text-[10px] p-0 h-4"
                    disabled={!!appliedCoupon}
                  />
                  <button
                    onClick={
                      appliedCoupon ? handleRemoveCoupon : handleApplyCoupon
                    }
                    className="text-[8px] font-bold text-[#F5C842] ml-1"
                  >
                    {appliedCoupon ? "REM" : "APP"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5 border-y border-white/5 text-[10px] font-bold tracking-tight">
                <div className="flex gap-2">
                  <div className="flex gap-0.5">
                    <span className="text-[#4A4A5A]">SUB:</span>
                    <span>
                      {curr}
                      {totals.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    <span className="text-[#4A4A5A]">TAX:</span>
                    <span>
                      {curr}
                      {totals.tax_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 items-baseline">
                  <span className="text-[#4A4A5A] text-[8px] uppercase">
                    Total:
                  </span>
                  <span className="text-[15px] text-[#F5C842]">
                    {curr}
                    {finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Wallet Toggle */}
              {walletCustomerId && walletBalance > 0 && (
                <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/10 rounded p-1.5">
                  <div className="flex items-center gap-1.5">
                    <Wallet size={12} className="text-[#3498DB]" />
                    <span className="text-[10px] text-[#9090A8]">
                      Wallet: {curr}
                      {walletBalance.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => setUseWallet(!useWallet)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${useWallet ? "bg-[#3498DB]" : "bg-[#1E1E26]"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${useWallet ? "left-4.5" : "left-0.5"}`}
                      style={{ left: useWallet ? "18px" : "2px" }}
                    />
                  </button>
                </div>
              )}

              <div
                className="grid grid-cols-4 gap-1"
                role="group"
                aria-label="Payment method"
              >
                {(["cash", "card", "upi", "split"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setPaymentMethod(m);
                      if (m === "split") setShowSplitPaymentModal(true);
                    }}
                    className={`py-1.5 rounded-sm text-[8px] font-bold uppercase tracking-wider border transition-all ${paymentMethod === m ? "bg-[#F5C842] border-[#F5C842] text-[#0D0D0F]" : "bg-[#141418] border-[#1E1E26] text-[#4A4A5A] hover:border-[#F5C842]/50"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {paymentMethod === "cash" && (
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center bg-[#141418] rounded border border-[#1E1E26] px-2 py-1">
                    <span className="text-[9px] uppercase font-bold text-[#4A4A5A]">
                      Tendered
                    </span>
                    <input
                      type="number"
                      value={amountPaid || ""}
                      onChange={(e) =>
                        setAmountPaid(parseFloat(e.target.value) || 0)
                      }
                      className="flex-1 bg-transparent border-none text-[11px] p-0 h-4"
                      placeholder="0.00"
                    />
                    <button
                      onClick={() => setAmountPaid(finalTotal)}
                      className="text-[9px] font-bold text-[#F5C842] hover:underline"
                    >
                      COPY
                    </button>
                  </div>
                  {amountPaid > finalTotal && (
                    <div className="flex justify-end">
                      <span className="text-[10px] font-bold text-[#2ECC71]">
                        Change: {curr}
                        {change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "upi" && settings.upi_id && (
                <div className="flex flex-col items-center gap-2 p-2 bg-[#141418] rounded border border-[#1E1E26]">
                  <QRCodeSVG
                    value={`upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.store_name)}&am=${finalTotal}&cu=INR`}
                    size={80}
                  />
                  <span className="text-[9px] text-[#4A4A5A] font-mono">
                    {settings.upi_id}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={handlePrintKOT}
                  disabled={processing}
                  aria-label="Print Kitchen Order Ticket"
                  className="flex-1 py-2 text-[10px] font-bold uppercase bg-[#141418] border border-[#1E1E26] rounded hover:bg-[#1E1E26] transition-colors"
                >
                  KOT
                </button>
                <button
                  onClick={handleHoldOrder}
                  disabled={processing}
                  aria-label="Hold order for later"
                  className="flex-1 py-2 text-[10px] font-bold uppercase bg-[#141418] border border-[#1E1E26] rounded hover:bg-[#1E1E26] transition-colors"
                >
                  Hold
                </button>
                <button
                  onClick={() => {
                    const order = toOrder(
                      uuid(),
                      user?.id || "system",
                      user?.name || "System",
                    );
                    order.status = "pending";
                    order.payment_method =
                      paymentMethod === "cash" ? "cash" : "upi"; // default for qr
                    order.total = finalTotal;
                    order.subtotal = totals.subtotal;
                    order.tax_amount = totals.tax_amount;
                    order.discount_amount =
                      totals.discount_amount + couponDiscount + walletDeduction;
                    const rec = generateReceipt(order, settings, true);
                    setReceipt(rec);
                    setLastOrder(order);
                  }}
                  disabled={processing || cart.length === 0}
                  className="p-2 rounded bg-[#141418] border border-[#1E1E26] hover:bg-[#1E1E26] shrink-0"
                  title="Print Proforma Receipt"
                >
                  <QrCode size={14} className="text-[#F5C842]" />
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={
                    processing ||
                    cart.length === 0 ||
                    (orderType === "dine_in" && !tableId)
                  }
                  className="flex-[3] py-2 text-[11px] font-bold uppercase bg-[#F5C842] text-[#0D0D0F] rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  data-checkout-button
                >
                  {processing ? (
                    <RefreshCw size={12} className="spin" />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  Charge {curr}
                  {finalTotal.toFixed(2)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Custom Item Modal */}
        {showCustomItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-md rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package size={20} className="text-[#F5C842]" /> Add Custom Item
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-[#9090A8] mb-1 block">
                    Item Name
                  </label>
                  <input
                    autoFocus
                    placeholder="e.g., Miscellaneous Repair"
                    className="w-full bg-[#141418] border-[#1E1E26] rounded-xl px-4 py-3"
                    value={customItem.name}
                    onChange={(e) =>
                      setCustomItem({ ...customItem, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9090A8] mb-1 block">
                    Price ({curr})
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-[#141418] border-[#1E1E26] rounded-xl px-4 py-3"
                    value={customItem.price}
                    onChange={(e) =>
                      setCustomItem({ ...customItem, price: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCustomItemModal(false);
                    setCustomItem({ name: "", price: "" });
                  }}
                  className="flex-1 py-3 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  disabled={!customItem.name || !customItem.price}
                  onClick={() => {
                    addCustomItem(
                      customItem.name,
                      parseFloat(customItem.price),
                    );
                    setShowCustomItemModal(false);
                    setCustomItem({ name: "", price: "" });
                  }}
                  className="flex-1 py-3 bg-[#F5C842] text-black font-bold rounded-xl disabled:opacity-50"
                >
                  Add to Cart
                </button>
                <button
                  disabled={!customItem.name || !customItem.price}
                  onClick={() => {
                    addCustomItem(
                      `RETURN: ${customItem.name}`,
                      -Math.abs(parseFloat(customItem.price)),
                    );
                    setShowCustomItemModal(false);
                    setCustomItem({ name: "", price: "" });
                  }}
                  className="flex-1 py-3 bg-red-500/10 text-red-500 font-bold border border-red-500/20 rounded-xl disabled:opacity-50"
                >
                  Add as Return
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Selection Modal */}
        {batchSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[#1E1E26] flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package size={20} className="text-[#F5C842]" /> Select Batch:{" "}
                  {batchSelection.product.name}
                </h3>
                <button
                  onClick={() => setBatchSelection(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                {batchSelection.batches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBatch(b)}
                    className="flex flex-col p-4 rounded-xl bg-[#141418] border border-[#1E1E26] hover:border-[#F5C842] transition-all text-left"
                  >
                    <div className="text-xs text-[#9090A8] uppercase font-bold mb-1">
                      Batch #{b.batch_number}
                    </div>
                    <div className="text-base font-bold mb-2">
                      Expires: {b.expiry_date || "No Expiry"}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[#F5C842] font-bold">
                        Qty: {b.quantity}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-[#141418] flex justify-end">
                <button
                  onClick={() => setBatchSelection(null)}
                  className="px-6 py-2 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Serial Selection Modal */}
        {serialSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[#1E1E26] flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package size={20} className="text-[#F5C842]" /> Select
                  Serial: {serialSelection.product.name}
                </h3>
                <button
                  onClick={() => setSerialSelection(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                {serialSelection.serials.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSerial(s)}
                    className="flex flex-col p-4 rounded-xl bg-[#141418] border border-[#1E1E26] hover:border-[#F5C842] transition-all text-left"
                  >
                    <div className="text-xs text-[#9090A8] uppercase font-bold mb-1">
                      Serial Number
                    </div>
                    <div className="text-base font-bold mb-2 font-mono">
                      {s.serial_number}
                    </div>
                    <div className="mt-auto text-[10px] text-green-500 font-bold uppercase tracking-wider">
                      Available
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-[#141418] flex justify-end">
                <button
                  onClick={() => setSerialSelection(null)}
                  className="px-6 py-2 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Split Payment Modal */}
        {showSplitPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-md rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Split size={20} className="text-[#F5C842]" /> Split Payment
              </h3>
              <p className="text-xs text-[#9090A8] mb-6">
                Allocate the total amount across different payment methods.
              </p>

              <div className="space-y-4 mb-6">
                {["cash", "card", "upi"].map((method) => {
                  const entry = splitPayments.find((p) => p.method === method);
                  return (
                    <div key={method} className="flex items-center gap-3">
                      <span className="w-16 text-sm font-bold uppercase text-[#4A4A5A]">
                        {method}
                      </span>
                      <div className="flex-1 flex items-center bg-[#141418] rounded-xl border border-[#1E1E26] overflow-hidden">
                        <span className="pl-3 text-[#4A4A5A]">{curr}</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={entry?.amount || ""}
                          onChange={(e) => {
                            const amt = parseFloat(e.target.value) || 0;
                            const others = splitPayments.filter(
                              (p) => p.method !== method,
                            );
                            setSplitPayments([
                              ...others,
                              {
                                method: method as PaymentMethod | "wallet",
                                amount: amt,
                              },
                            ]);
                          }}
                          className="flex-1 bg-transparent border-none px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl mb-6 bg-[#141418] border border-[#1E1E26]">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#9090A8]">Order Total</span>
                  <span className="font-bold text-white">
                    {curr}
                    {finalTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#9090A8]">Allocated</span>
                  <span className="font-bold text-[#F5C842]">
                    {curr}
                    {splitPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-[#1E1E26]">
                  <span className="text-[#9090A8]">Remaining</span>
                  <span
                    className={`font-bold ${Math.abs(finalTotal - splitPayments.reduce((s, p) => s + p.amount, 0)) < 0.01 ? "text-[#2ECC71]" : "text-[#E74C3C]"}`}
                  >
                    {curr}
                    {(
                      finalTotal -
                      splitPayments.reduce((s, p) => s + p.amount, 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSplitPaymentModal(false);
                    setPaymentMethod("cash");
                  }}
                  className="flex-1 py-3 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  disabled={
                    Math.abs(
                      finalTotal -
                        splitPayments.reduce((s, p) => s + p.amount, 0),
                    ) > 0.01
                  }
                  onClick={() => setShowSplitPaymentModal(false)}
                  className="flex-1 py-3 bg-[#F5C842] text-black font-bold rounded-xl disabled:opacity-50"
                >
                  Confirm Split
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Override Price Input Modal */}
        {showPinModal?.type === "price_override" && overridePrice === "" && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold mb-4">Enter New Price</h3>
              <input
                autoFocus
                type="number"
                placeholder={`New Price (${curr})`}
                className="w-full bg-[#141418] border-[#1E1E26] rounded-xl px-4 py-3 mb-6"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && overridePrice) {
                    // price entered, PIN handled by PinModal wrapper
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPinModal(null);
                    setOverridePrice("");
                  }}
                  className="flex-1 py-3 bg-[#1E1E26] rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pin Modals */}
        {showPinModal && (
          <PinModal
            title={
              showPinModal.type === "price_override"
                ? "Authorize Price Override"
                : showPinModal.type === "void"
                  ? "Authorize Void Transaction"
                  : "Authorize No Sale"
            }
            description="Manager PIN required to perform this action."
            onCancel={() => {
              setShowPinModal(null);
              setOverridePrice("");
            }}
            onSuccess={async () => {
              if (
                showPinModal.type === "price_override" &&
                showPinModal.productId &&
                overridePrice
              ) {
                overrideItemPrice(
                  showPinModal.productId,
                  parseFloat(overridePrice),
                );
                setShowPinModal(null);
                setOverridePrice("");
              } else if (showPinModal.type === "void") {
                try {
                  await dbAddActivityLog(
                    activeStoreId,
                    "void_cart",
                    voidReason,
                    user?.id || "system",
                    user?.name || "System",
                  );
                  clearCart();
                } catch (e) {}
                setShowPinModal(null);
                setShowVoidReasonModal(false);
                setVoidReason("");
              } else if (showPinModal.type === "no_sale") {
                try {
                  await dbAddActivityLog(
                    activeStoreId,
                    "no_sale_drawer_open",
                    "Manual drawer opening",
                    user?.id || "system",
                    user?.name || "System",
                  );
                  await openCashDrawer();
                } catch (e) {}
                setShowPinModal(null);
              }
            }}
          />
        )}

        {/* Void Reason Modal */}
        {showVoidReasonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-md rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trash2 size={20} className="text-[#E74C3C]" /> Void Transaction
              </h3>
              <p className="text-xs text-[#9090A8] mb-4">
                Please provide a reason for cancelling this sale.
              </p>
              <textarea
                autoFocus
                placeholder="Reason for voiding (e.g., Customer changed mind, Mistake in entry)"
                className="w-full bg-[#141418] border-[#1E1E26] rounded-xl px-4 py-3 mb-6 h-24 resize-none"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowVoidReasonModal(false);
                    setVoidReason("");
                  }}
                  className="flex-1 py-3 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  disabled={!voidReason.trim()}
                  onClick={handleVoidOrder}
                  className="flex-1 py-3 bg-[#E74C3C] text-white font-bold rounded-xl disabled:opacity-50"
                >
                  Confirm Void
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Prompt Modal */}
        {metadataPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-md rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#F5C842]" />{" "}
                {metadataPrompt.name}
              </h3>
              <p className="text-xs text-[#9090A8] mb-4">
                Please enter the {metadataPrompt.field} for this item to
                proceed.
              </p>
              <input
                autoFocus
                placeholder={`Enter ${metadataPrompt.field}`}
                className="w-full bg-[#141418] border-[#1E1E26] rounded-xl px-4 py-3 mb-4"
                value={metadataValue}
                onChange={(e) => setMetadataValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMetadataSubmit()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMetadataPrompt(null);
                    setMetadataValue("");
                  }}
                  className="flex-1 py-3 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMetadataSubmit}
                  className="flex-1 py-3 bg-[#F5C842] text-black font-bold rounded-xl"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Variant Selection Modal */}
        {variantSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[#1E1E26] flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package size={20} className="text-[#F5C842]" /> Select
                  Variant: {variantSelection.product.name}
                </h3>
                <button
                  onClick={() => setVariantSelection(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                {variantSelection.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVariant(v)}
                    className="flex flex-col p-4 rounded-xl bg-[#141418] border border-[#1E1E26] hover:border-[#F5C842] transition-all text-left"
                  >
                    <div className="text-xs text-[#9090A8] uppercase font-bold mb-1">
                      {v.name}
                    </div>
                    <div className="text-base font-bold mb-2">{v.value}</div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[#F5C842] font-bold">
                        {curr}
                        {v.price.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${v.stock > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
                      >
                        {v.stock > 0 ? `In Stock: ${v.stock}` : "Out of Stock"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-[#141418] flex justify-end">
                <button
                  onClick={() => setVariantSelection(null)}
                  className="px-6 py-2 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table Selection Modal */}
        {showTableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[#1E1E26] flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FolderOpen size={20} className="text-[#F5C842]" /> Select
                  Table
                </h3>
                <button
                  onClick={() => setShowTableModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    data-testid={`table-option-${t.name}`}
                    onClick={() => {
                      setTable(t.id, t.name);
                      setShowTableModal(false);
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                      tableId === t.id
                        ? "bg-[#F5C842]/10 border-[#F5C842] text-[#F5C842]"
                        : t.status === "occupied"
                          ? "bg-red-500/5 border-red-500/20 text-red-500 opacity-60"
                          : "bg-[#141418] border-[#1E1E26] text-gray-400 hover:border-[#F5C842]"
                    }`}
                  >
                    <span className="text-lg font-bold">{t.name}</span>
                    <span className="text-[10px] uppercase font-bold opacity-60 mt-1">
                      {t.status}
                    </span>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-[#141418] flex justify-end">
                <button
                  onClick={() => setShowTableModal(false)}
                  className="px-6 py-2 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Held Orders Modal */}
        {showHeldOrders && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={(e) =>
              e.target === e.currentTarget && setShowHeldOrders(false)
            }
          >
            <div
              className="card p-6 w-[500px] max-h-[80vh] overflow-y-auto fade-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="held-orders-title"
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  id="held-orders-title"
                  className="font-display text-base flex items-center gap-2"
                  style={{ color: "#F5C842" }}
                >
                  <Clock size={20} /> Held Orders
                </h2>
                <button
                  onClick={() => setShowHeldOrders(false)}
                  className="btn-ghost py-1 px-3"
                  aria-label="Close"
                >
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
                    <div
                      key={order.id}
                      className="p-4 rounded-lg"
                      style={{ background: "#1E1E26" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">Order #{idx + 1}</span>
                          <span
                            className="text-xs ml-2 px-2 py-0.5 rounded"
                            style={{
                              background: "rgba(245,200,66,0.2)",
                              color: "#F5C842",
                            }}
                          >
                            {order.order_type}
                          </span>
                        </div>
                        <span
                          className="font-semibold"
                          style={{ color: "#F5C842" }}
                        >
                          {curr}
                          {order.total.toFixed(2)}
                        </span>
                      </div>
                      <div
                        className="text-sm mb-2"
                        style={{ color: "#9090A8" }}
                      >
                        {order.items.length} items •{" "}
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                      <div
                        className="text-xs mb-3"
                        style={{ color: "#4A4A5A" }}
                      >
                        {order.items
                          .map((i) => `${i.product_name}×${i.quantity}`)
                          .join(", ")}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestoreOrder(order)}
                          className="btn-accent flex-1 py-1.5 text-xs font-bold uppercase"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => {
                            const rec = generateReceipt(order, settings, true);
                            setReceipt(rec);
                            setLastOrder(order);
                            setShowHeldOrders(false);
                          }}
                          className="py-1.5 px-3 rounded bg-[#141418] border border-[#1E1E26] text-[#F5C842] hover:bg-[#1E1E26] flex items-center justify-center"
                          title="Print Payment Receipt"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteHeldOrder(order.id)}
                          className="btn-danger py-1.5 px-3 text-xs font-bold uppercase"
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

      {/* Top-Level Printable Components (Foolproof outside any modals) */}
      <div
        id="printable-receipt"
        style={{ visibility: "hidden", display: "none" }}
        className="print:block print:visible"
      >
        {receipt && (
          <div className="flex flex-col gap-1 text-black bg-white w-full">
            {receipt.split("\n").map((line, i) => {
              const trimmed = line.trim();
              if (trimmed.startsWith("[LOGO: ") && trimmed.endsWith("]")) {
                const path = trimmed.slice(7, -1).trim();
                let imgSrc = "";
                try {
                  imgSrc =
                    typeof window !== "undefined" &&
                    (window as any).__TAURI_METADATA__
                      ? convertFileSrc(path)
                      : path;
                } catch (e) {}

                return (
                  <div key={i} className="flex justify-center mb-4">
                    <img
                      src={imgSrc}
                      alt="Logo"
                      className="max-h-24 object-contain"
                    />
                  </div>
                );
              }
              if (trimmed.startsWith("[QRCODE: ") && trimmed.endsWith("]")) {
                const url = trimmed.slice(9, -1).trim();
                return (
                  <div
                    key={i}
                    className="qr-container flex flex-col items-center gap-2 mt-4 px-4 py-6 bg-white text-black rounded-lg mb-4"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: "100%",
                      backgroundColor: "white",
                      color: "black",
                      visibility: "visible",
                    }}
                  >
                    <div
                      className="text-[10pt] font-extrabold uppercase tracking-widest text-center"
                      style={{ color: "black" }}
                    >
                      Scan to Pay UPI
                    </div>
                    <div
                      className="p-3 bg-white border-2 border-black rounded-xl"
                      style={{ backgroundColor: "white" }}
                    >
                      {qrBase64 ? (
                        <img
                          src={qrBase64}
                          alt="QR Code"
                          width={150}
                          height={150}
                        />
                      ) : (
                        <QRCodeCanvas value={url} size={150} />
                      )}
                    </div>
                    <div
                      className="text-[11pt] font-bold text-center"
                      style={{ color: "black" }}
                    >
                      {settings.upi_id}
                    </div>
                    <div
                      className="text-[14pt] font-black text-center mt-1"
                      style={{ color: "black" }}
                    >
                      PAYABLE: {currValue}
                      {totalToPayValue.toFixed(2)}
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="whitespace-pre">
                  {line || "\u00A0"}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden QR Generator (Always available at top level) */}
      <div
        style={{
          position: "fixed",
          top: "-10000px",
          left: "-10000px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {upiUrlValue && (
          <div ref={qrRef} id="hidden-qr-generator">
            <QRCodeCanvas
              value={upiUrlValue}
              size={512}
              includeMargin={true}
              level="H"
            />
          </div>
        )}
      </div>
    </>
  );
}
