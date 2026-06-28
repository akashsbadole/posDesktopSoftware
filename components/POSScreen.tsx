"use client";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
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
  Camera,
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
  dbGetCustomerUnpaidOrders,
  dbGetCustomerByPhone,
  dbGetCustomerAddresses,
  Coupon,
  CustomerWallet,
  Combo,
  dbHoldOrder,
  openCashDrawer,
  printReceipt,
  printToPrinter,
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
  dbRedeemGiftCard,
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
import { uiLogger } from "@/lib/logger";
import PinModal from "./PinModal";
import { getIndustryLabels } from "@/lib/industry";
import { v4 as uuid } from "uuid";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import { Lock } from "lucide-react";
import { Order } from "@/lib/db";
import { useTranslation } from "@/lib/i18n";

export default function POSScreen() {
  const { activeStoreId } = useSettingsStore();
  const { stores } = useStoresStore();
  const activeStore = stores.find((s) => s.id === activeStoreId);
  const labels = getIndustryLabels(activeStore?.industry || "food");
  const t = useTranslation();

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

  const products = useProductsStore((s) => s.products);
  const categories = useProductsStore((s) => s.categories);
  const productsLoading = useProductsStore((s) => s.isLoading);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const getFilteredProducts = useProductsStore((s) => s.getFilteredProducts);
  const setSelectedCategory = useProductsStore((s) => s.setSelectedCategory);
  const setSearchQuery = useProductsStore((s) => s.setSearchQuery);
  const selectedCategory = useProductsStore((s) => s.selectedCategory);
  const searchQuery = useProductsStore((s) => s.searchQuery);
  const fetchVariants = useProductsStore((s) => s.fetchVariants);
  const sortBy = useProductsStore((s) => s.sortBy);
  const sortOrder = useProductsStore((s) => s.sortOrder);

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
  const [localSearch, setLocalSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showGiftCardRedeem, setShowGiftCardRedeem] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardAmount, setGiftCardAmount] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

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
      if (e.ctrlKey || e.metaKey) return;

      const isInputFocused =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if (isInputFocused) {
        if (e.key === "Escape") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
          setIsGridFocused(true);
        }
        return;
      }

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
        e.preventDefault();
        searchInputRef.current?.focus();
        setLocalSearch("");
        setSearchQuery("");
      }
      if (e.key === "1") setOrderType("dine_in");
      if (e.key === "2") setOrderType("takeaway");
      if (e.key === "3") setOrderType("delivery");

      // Payment Methods
      if (e.altKey && e.key === "1") setPaymentMethod("cash");
      if (e.altKey && e.key === "2") setPaymentMethod("card");
      if (e.altKey && e.key === "3") setPaymentMethod("upi");
      if (e.altKey && e.key === "4") {
        if (activeCustomer && walletCustomerId) {
          setPaymentMethod("store_credit");
        } else {
          alert(t("pos.errors.selectCustomerForCredit"));
          setIsEditingCustomer(true);
        }
      }
      if (e.altKey && e.key === "5") {
        setPaymentMethod("split");
        setShowSplitPaymentModal(true);
      }

      // Cart Actions
      if (e.key === "F9") {
        e.preventDefault();
        handlePrintKOT();
      }
      if (e.key === "F10") {
        e.preventDefault();
        handleHoldOrder();
      }
      if (e.key === "F12") {
        e.preventDefault();
        handleCheckout();
      }

      // Price Tier
      if (e.altKey && (e.key === "q" || e.key === "Q")) {
        setPriceTier(priceTier === "retail" ? "wholesale" : "retail");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cart.length,
    clearCart,
    setOrderType,
    setPaymentMethod,
    setPriceTier,
    priceTier,
    activeCustomer,
    walletCustomerId,
  ]);

  const filtered = useMemo(
    () => getFilteredProducts(),
    [products, selectedCategory, searchQuery, sortBy, sortOrder],
  );

  const getGridColumns = useCallback(() => {
    if (productGridRef.current) {
      const width = productGridRef.current.clientWidth;
      return Math.floor(width / 150) || 4;
    }
    return 4;
  }, []);

  const getNewIndex = useGridNavigation(
    filtered.length,
    () => { },
    getGridColumns(),
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && localSearch.trim()) {
      const exactMatch = products.find((p) => p.barcode === localSearch.trim());
      if (exactMatch) {
        addItem(exactMatch);
        setLocalSearch("");
        setSearchQuery("");
      }
    }
    if (e.key === "Escape") {
      setLocalSearch("");
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
          alert(t("pos.errors.noAvailableBatches"));
          return;
        }
      } catch (err) {
        uiLogger.error("Failed to fetch batches", err);
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
          phone: customer.phone || "",
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
        if (customer.price_tier === "premium") {
          setGlobalDiscount(5, "percentage");
        } else if (customer.price_tier === "vip") {
          setGlobalDiscount(10, "percentage");
        }
      } else {
        setActiveCustomer(null);
        setWalletBalance(0);
        setWalletCustomerId(null);
        setCustomerAddresses([]);
      }
    } catch (error) {
      uiLogger.error("Failed to lookup customer", error);
      alert(t("pos.errors.failedToLookupCustomer"));
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
          newErrors.phone = t("pos.errors.phoneRequiredForDelivery");
        }
        if (!customerInfo?.address || customerInfo.address.trim().length < 5) {
          newErrors.address = t("pos.errors.deliveryAddressRequired");
        }
      }

      if (orderType === "dine_in" && !tableId) {
        alert(t("pos.errors.selectTable"));
        return;
      }

      if (paymentMethod === "cash" && (amountPaid || 0) < finalTotal) {
        newErrors.amount = t("pos.errors.insufficientTendered");
      }

      if (paymentMethod === "split") {
        const splitTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0);
        if (Math.abs(splitTotal - finalTotal) > 0.01) {
          newErrors.split = t("pos.errors.splitTotalMismatch", { currency: curr, split: splitTotal.toFixed(2), total: finalTotal.toFixed(2) });
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
      const rec = generateReceipt(order, settings);

      await dbSaveOrder(order, activeStoreId);

      const sideEffects: Promise<void>[] = [];

      if (appliedCoupon) {
        sideEffects.push(
          useCoupon(appliedCoupon.code, activeStoreId).catch((e) =>
            uiLogger.error("Failed to mark coupon used", e),
          ),
        );
      }
      if (useWallet && walletCustomerId && walletDeduction > 0) {
        sideEffects.push(
          deductWalletBalance(walletCustomerId, walletDeduction, order.id).catch(
            (e) => uiLogger.error("Failed to deduct wallet", e),
          ),
        );
      }
      if (paymentMethod === "store_credit" && walletCustomerId) {
        sideEffects.push(
          deductWalletBalance(walletCustomerId, finalTotal, order.id).catch(
            (e) => uiLogger.error("Failed to record credit sale in wallet", e),
          ),
        );
      }
      sideEffects.push(
        openCashDrawer().catch((e) => uiLogger.info("Cash drawer not available")),
      );
      await Promise.all(sideEffects);

      if (walletCustomerId) {
        try {
          const updatedWallet = await getCustomerWallet(walletCustomerId);
          setWalletBalance(updatedWallet.balance);
        } catch (e) {
          uiLogger.error("Failed to fetch wallet balance", e);
        }
      }

      setReceipt(rec);
      setLastOrder(order);

      // Auto-printing logic
      if (settings?.auto_print_receipt) {
        const printerName = settings.receipt_printer_name || undefined;
        printToPrinter(rec, printerName).catch((e) =>
          uiLogger.error("Auto-print receipt failed", e),
        );
      }
      if (settings?.auto_print_kot) {
        const kotText = generateKOTText(order);
        printReceipt(kotText).catch((e) => uiLogger.error("Auto-print KOT failed", e));
      }
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
      uiLogger.error("Checkout failed", err);
      alert(t("pos.errors.orderFailed"));
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

      // Auto-print KOT on hold
      if (settings?.auto_print_kot) {
        const kotText = generateKOTText(order);
        printReceipt(kotText).catch((e) => uiLogger.error("Auto-print KOT failed on hold", e));
      }

      alert(t("common.savedSuccess"));
      clearCart();
      await loadHeldOrders();
    } catch (err) {
      uiLogger.error("Failed to hold order", err);
      alert(t("pos.errors.holdFailed"));
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
      printReceipt(kotText).catch((e) => uiLogger.error("Auto-print KOT failed", e));
      await dbSaveOrder(order, activeStoreId);
      alert(t("pos.kot.printed"));
      clearCart();
    } catch (err) {
      uiLogger.error("Failed to print KOT", err);
      alert(t("pos.kot.printFailed"));
    }
    setProcessing(false);
  };

  const generateKOTText = (order: Order): string => {
    const lines = [
      "=".repeat(32),
      t("pos.kot.title"),
      "=".repeat(32),
      `${t("pos.kot.orderNumber")} ${order.id.slice(0, 8).toUpperCase()}`,
      `${t("pos.kot.type")} ${order.order_type.toUpperCase()}`,
      `${t("pos.kot.table")} ${tableName || "N/A"}`,
      `${t("pos.kot.customer")} ${order.customer_name || "Guest"}`,
      `${t("pos.kot.time")} ${new Date().toLocaleTimeString()}`,
      "-".repeat(32),
      t("pos.kot.items"),
      ...order.items.map(
        (item, idx) => `${idx + 1}. ${item.product_name} x${item.quantity}`,
      ),
      "-".repeat(32),
      notes ? `${t("pos.kot.notes")} ${notes}` : "",
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
    if (!confirm(t("pos.modals.deleteHeldOrder"))) return;
    try {
      await dbDeletePendingOrder(id, activeStoreId);
      await loadHeldOrders();
    } catch (err) {
      uiLogger.error("Failed to delete held order", err);
    }
  };

  const curr = settings?.currency_symbol ?? "₹";

  const handlePrint = () => {
    if (!receipt) return;
    requestAnimationFrame(() => {
      window.print();
    });
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
      alert(t("pos.errors.receiptSaved", { path }));
    } catch (err) {
      uiLogger.error("Failed to save receipt", err);
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
  const activeUpiId =
    lastOrder?.payment_method === "paytm"
      ? (settings.paytm_upi_id || settings.upi_id)
      : lastOrder?.payment_method === "razorpay"
        ? (settings.razorpay_upi_id || settings.upi_id)
        : settings.upi_id;
  const upiUrlValue =
    isIndia && activeUpiId
      ? `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(settings.store_name)}&am=${totalToPayValue.toFixed(2)}&cu=INR`
      : null;

  useEffect(() => {
    if (upiUrlValue && qrRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const canvas = qrRef.current?.querySelector("canvas");
          if (canvas) {
            try {
              setQrBase64(canvas.toDataURL("image/png", 1.0));
            } catch (e) {
              uiLogger.error("Failed to capture QR as image", e);
            }
          }
        });
      });
    } else {
      setQrBase64(null);
    }
  }, [upiUrlValue, receipt]);

  if (processing) {
    // keep processing early return if needed, but receipt should be a modal
  }

  const allCategories = [t("common.all"), t("products.combosTab"), ...categories];
  const activeCombos = getActiveCombos();
  const showCombos = selectedCategory === "Combos";

  return (
    <>
      {receipt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm no-print"
          role="region"
          aria-label={t("pos.receipt.orderComplete")}
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
                {isUnpaid ? t("pos.receipt.paymentRequest") : t("pos.receipt.orderComplete")}
              </h2>
              <button
                onClick={() => {
                  setReceipt(null);
                  setLastOrder(null);
                }}
                className="btn-ghost py-1 px-3"
                aria-label={t("pos.receipt.closeAndStartNew")}
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
                    } catch (e) { }

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
                          {t("pos.receipt.scanToPayUpi")}
                        </div>
                        <div className="p-3 bg-white rounded-xl">
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
                        <div className="text-xs font-bold text-[#F5C842]">
                          {activeUpiId}
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
                    {t("pos.receipt.scanToPayUpi")}
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <QRCodeSVG value={upiUrlValue} size={120} />
                  </div>
                  <div className="text-xs font-bold text-[#F5C842]">
                    {currValue}
                    {lastOrder?.total.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-gray-500 text-center truncate w-full">
                    {activeUpiId}
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
                <Plus size={14} aria-hidden="true" /> {t("pos.newOrder")}
              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={handlePrint}
                aria-label={t("pos.receipt.printReceipt")}
              >
                <Printer size={16} aria-hidden="true" />
              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={handleWhatsAppShare}
                aria-label={t("pos.receipt.shareWhatsapp")}
              >
                <MessageCircle size={16} aria-hidden="true" />

              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={handleEmailShare}
                aria-label={t("pos.receipt.shareEmail")}
              >
                <Mail size={16} aria-hidden="true" />
              </button>
              <button
                className="btn-ghost py-3 px-3 flex items-center gap-1.5"
                onClick={handleSaveReceipt}
                aria-label={t("pos.receipt.saveToFile")}
              >
                <Save size={16} aria-hidden="true" />
              </button>
              <button
                className={`btn-ghost py-3 px-3 flex items-center gap-1.5 relative opacity-50`}
                onClick={async () => {
                  if (lastOrder?.delivery_phone) {
                    try {
                      await sendSmsNotification(
                        lastOrder.delivery_phone,
                        receipt,
                        activeStoreId,
                      );
                      alert(t("pos.receipt.smsSent"));
                    } catch (e) {
                      alert(t("pos.receipt.failedToSendSms"));
                    }
                  } else {
                    alert(t("pos.receipt.noPhoneForOrder"));
                  }
                }}
                aria-label={t("pos.receipt.shareSms")}
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
                {t("pos.searchBarcode")}
              </label>
              <input
                id="product-search"
                ref={searchInputRef}
                placeholder={t("pos.searchBarcodePlaceholder")}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchQuery(localSearch);
                  }
                  handleSearchKeyDown(e);
                }}
                style={{ paddingLeft: 36 }}
                aria-describedby="search-hint"
              />
              <span id="search-hint" className="sr-only">
                {t("pos.searchHint")}
              </span>
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-1"
                title={t("pos.scanBarcodeTitle")}
                aria-label={t("pos.openScanner")}
              >
                <Camera size={16} />
              </button>
            </div>
            <div
              className="flex gap-1"
              role="group"
              aria-label="Filter by category"
            >
              <button
                onClick={() => setShowCustomItemModal(true)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all bg-[#141418] text-[#F5C842] border border-[#1E1E26] hover:bg-[#1E1E26] flex items-center gap-1"
                aria-label={t("pos.addCustomItem")}
              >
                <Plus size={12} /> {t("pos.custom")}
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
              title={t("common.refresh")}
              aria-label={t("pos.refreshProducts")}
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
              <span className="sr-only">{t("pos.loadingProducts")}</span>
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
              aria-label={showCombos ? t("pos.comboDeals") : t("pos.productGrid")}
              aria-readonly="true"
            >
              {showCombos ? (
                activeCombos.length === 0 ? (
                  <div
                    className="col-span-full flex flex-col items-center justify-center py-12"
                    style={{ color: "#4A4A5A" }}
                  >
                    <Tag size={48} className="mb-4 opacity-50" />
                    <p className="text-base mb-2">{t("pos.noActiveCombos")}</p>
                    <p className="text-sm">
                      {t("pos.createComboHint")}
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
                          {combo.discount_percent.toFixed(0)}{t("products.percentOff")}
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
                            <span> +{t("common.showMore", { count: combo.items.length - 2 })}</span>
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
                      aria-label={`${p.name}, ${p.category}, ${curr}${p.price}, ${t("pos.stock")} ${p.stock}${inCart ? `, ${t("pos.currentQty")} ${inCart.quantity}` : ""}${oos ? `, ${t("common.outOfStock")}` : ""}`}
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
                        {p.price.toFixed(2)}
                      </div>
                      <div style={{ color: "#4A4A5A", fontSize: 10 }}>
                        {t("pos.stock")} {p.stock}
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
                          {t("common.outOfStock")}
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
          aria-label={t("pos.cart")}
        >
          <div className="p-3 border-b border-border bg-[#0D0D0F]/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="font-display font-bold text-sm uppercase tracking-tight text-[#F5C842]"
                  aria-live="polite"
                >
                  {t("pos.cartCount", { count: itemCount })}
                </span>
                <div
                  className="flex bg-[#141418] rounded-md p-0.5 border border-[#1E1E26]"
                  role="group"
                  aria-label={t("pos.retailPriceTier")}
                >
                  <button
                    onClick={() => setPriceTier("retail")}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all ${priceTier === "retail" ? "bg-[#F5C842] text-[#0D0D0F]" : "text-[#4A4A5A]"}`}
                    aria-label={t("pos.retailPriceTier")}
                  >
                    {t("pos.retail")}
                  </button>
                  <button
                    onClick={() => setPriceTier("wholesale")}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all ${priceTier === "wholesale" ? "bg-[#F5C842] text-[#0D0D0F]" : "text-[#4A4A5A]"}`}
                    aria-label={t("pos.wholesalePriceTier")}
                  >
                    {t("pos.wholesale")}
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={handleNoSale}
                  className="p-1.5 rounded-lg text-[#2ECC71] bg-green-500/5 border border-green-500/10 hover:bg-green-500/10"
                  title={t("pos.openDrawer")}
                >
                  <Banknote size={14} />
                </button>
                <button
                  onClick={handleClearCart}
                  className="p-1.5 rounded-lg text-[#E74C3C] bg-red-500/5 border border-red-500/10 hover:bg-red-500/10"
                  title={t("pos.clearCart")}
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

            <div className="flex gap-1" role="group" aria-label={t("pos.orderType")}>
              {[
                { id: "dine_in", label: labels.dine_in, key: "1" },
                {
                  id: "takeaway",
                  label: labels.takeaway.split("/")[1] || t("pos.takeaway"),
                  key: "2"
                },
                { id: "delivery", label: t("pos.delivery"), key: "3" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setOrderType(type.id as OrderType)}
                  aria-label={`${type.label} ${t("pos.orderType")} (${type.key})`}
                  className={`flex-1 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${orderType === type.id ? "bg-[#F5C842] border-[#F5C842] text-[#0D0D0F]" : "bg-[#141418] border-[#1E1E26] text-[#4A4A5A] hover:border-[#F5C842]/50"}`}
                >
                  {type.label} <span className="text-[7px] opacity-40 ml-0.5">{type.key}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pt-2">
            <div className="grid grid-cols-2 gap-1 border border-[#1E1E26] rounded-sm p-1.5 bg-[#141418]/30 mb-1.5">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold text-[#4A4A5A] leading-none mb-1">
                  {t("pos.tableLabel")}
                </span>
                <button
                  onClick={() => setShowTableModal(true)}
                  data-testid="select-table-btn"
                  className="text-[10px] font-bold text-white flex items-center justify-between hover:text-[#F5C842] transition-colors"
                >
                  <span className="truncate">{tableName || t("pos.noTableLabel")}</span>
                  <span className="text-[8px] text-[#F5C842] uppercase ml-1">
                    {t("pos.edit")}
                  </span>
                </button>
              </div>
              <div className="flex flex-col border-l border-[#1E1E26] pl-1.5">
                <span className="text-[8px] uppercase font-bold text-[#4A4A5A] leading-none mb-1">
                  {t("pos.customer")}
                </span>
                <button
                  onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                  data-testid="edit-customer-btn"
                  aria-label={`${t("pos.customer")}: ${customerInfo?.name || activeCustomer?.name || t("pos.walkInCustomer")}. ${t("pos.edit")}`}
                  className="text-[10px] font-bold text-white flex items-center justify-between hover:text-[#F5C842] transition-colors"
                >
                  <span className="truncate">
                    {customerInfo?.name || activeCustomer?.name || t("pos.walkInCustomer")}
                  </span>
                  <span className="text-[8px] text-[#F5C842] uppercase ml-1">
                    {t("pos.edit")}
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
                    placeholder={t("pos.customerName")}
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
                    placeholder={t("pos.phonePlaceholder")}
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
                    placeholder={t("pos.addressPlaceholder")}
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
                  {t("pos.closeEditor")}
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
                <div className="mt-3 text-sm">{t("pos.cartEmpty")}</div>
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
                      aria-label={`${t("pos.decreaseQty")} ${item.product.name}`}
                    >
                      <Minus size={8} />
                    </button>
                    <span
                      className="w-5 text-center text-[9px] font-bold leading-none"
                      aria-label={`${t("pos.currentQty")} ${item.quantity}`}
                      aria-live="polite"
                    >
                      {item.quantity}x
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.cartItemId, item.quantity + 1)
                      }
                      className="px-1 h-full hover:bg-[#F5C842] hover:text-[#0D0D0F] transition-colors"
                      aria-label={`${t("pos.increaseQty")} ${item.product.name}`}
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
                      aria-label={`${t("pos.overridePrice")} ${item.product.name}. ${t("pos.currentQty")} ${curr}${currentPrice.toFixed(2)}`}
                      className="text-[10px] font-bold text-[#F5C842] tabular-nums"
                    >
                      {curr}
                      {currentPrice.toFixed(2)}
                    </button>
                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      className="text-[#4A4A5A] hover:text-[#E74C3C]"
                      aria-label={t("pos.remove")}
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
                    {t("pos.disc")}
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
                    {t("pos.tip")}
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
                    placeholder={t("pos.coupon")}
                    className="flex-1 bg-transparent border-none text-[10px] p-0 h-4"
                    disabled={!!appliedCoupon}
                  />
                  <button
                    onClick={
                      appliedCoupon ? handleRemoveCoupon : handleApplyCoupon
                    }
                    className="text-[8px] font-bold text-[#F5C842] ml-1"
                  >
                    {appliedCoupon ? t("pos.rem") : t("pos.app")}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5 border-y border-white/5 text-[10px] font-bold tracking-tight">
                <div className="flex gap-2">
                  <div className="flex gap-0.5">
                    <span className="text-[#4A4A5A]">{t("pos.subtotalLabel")}</span>
                    <span>
                      {curr}
                      {totals.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    <span className="text-[#4A4A5A]">{t("pos.taxLabel")}</span>
                    <span>
                      {curr}
                      {totals.tax_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 items-baseline" aria-live="polite">
                  <span className="text-[#4A4A5A] text-[8px] uppercase">
                    {t("pos.totalLabel")}
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
                      {t("pos.walletBalance", { currency: curr, balance: walletBalance.toFixed(2) })}
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
                className="grid grid-cols-6 gap-1"
                role="group"
                aria-label="Payment method"
              >
                {(["cash", "card", "upi", "paytm", "razorpay", "store_credit", "gift_card", "split"] as const).map(
                  (m, idx) => {
                    const paymentLabels: Record<string, string> = {
                      cash: t("pos.payment.cash"),
                      card: t("pos.payment.card"),
                      upi: t("pos.payment.upi"),
                      paytm: t("pos.payment.paytm"),
                      razorpay: t("pos.payment.razorpay"),
                      store_credit: t("pos.payment.credit"),
                      gift_card: t("pos.payment.giftCard"),
                      split: t("pos.payment.split"),
                    };
                    return (
                    <button
                      key={m}
                      aria-label={`${paymentLabels[m]} (Alt+${idx + 1})`}
                      onClick={() => {
                        if (
                          m === "store_credit" &&
                          (!activeCustomer || !walletCustomerId)
                        ) {
                          alert(t("pos.errors.selectCustomerForCredit"));
                          setIsEditingCustomer(true);
                          return;
                        }

                        if (m === "store_credit" && activeCustomer) {
                          const limit = activeCustomer.credit_limit || 0;
                          const currentDebt = Math.abs(
                            Math.min(0, walletBalance),
                          );
                          if (limit > 0 && currentDebt + finalTotal > limit) {
                            alert(t("pos.payment.creditLimitExceeded", { limit: `${curr}${limit}` }));
                            return;
                          }
                        }

                        setPaymentMethod(m);
                        if (m === "split") setShowSplitPaymentModal(true);
                        if (m === "gift_card") setShowGiftCardRedeem(true);
                      }}
                      className={`py-1.5 rounded-sm text-[8px] font-bold uppercase tracking-wider border transition-all ${paymentMethod === m ? "bg-[#F5C842] border-[#F5C842] text-[#0D0D0F]" : "bg-[#141418] border-[#1E1E26] text-[#4A4A5A] hover:border-[#F5C842]/50"}`}
                      title={m === "store_credit" ? t("pos.payment.storeCredit") : paymentLabels[m]}
                    >
                      {paymentLabels[m]}
                    </button>
                    );
                  },
                )}
              </div>

              {paymentMethod === "cash" && (
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center bg-[#141418] rounded border border-[#1E1E26] px-2 py-1">
                    <span className="text-[9px] uppercase font-bold text-[#4A4A5A]">
                      {t("pos.tendered")}
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
                      {t("pos.copy")}
                    </button>
                  </div>
                  {amountPaid > finalTotal && (
                    <div className="flex justify-end">
                      <span className="text-[10px] font-bold text-[#2ECC71]">
                        {t("pos.change", { currency: curr, amount: change.toFixed(2) })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "upi" && settings.upi_id ? (
                <div className="flex flex-col items-center gap-2 p-2 bg-[#141418] rounded border border-[#1E1E26]">
                  <QRCodeSVG
                    value={`upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.store_name)}&am=${finalTotal}&cu=INR`}
                    size={80}
                  />
                  <span className="text-[9px] text-[#4A4A5A] font-mono">{settings.upi_id}</span>
                </div>
              ) : paymentMethod === "paytm" && (settings.paytm_upi_id || settings.upi_id) ? (
                <div className="flex flex-col items-center gap-2 p-2 bg-[#141418] rounded border border-[#1E1E26]">
                  <QRCodeSVG
                    value={`upi://pay?pa=${settings.paytm_upi_id || settings.upi_id}&pn=${encodeURIComponent(settings.store_name)}&am=${finalTotal}&cu=INR`}
                    size={80}
                  />
                  <span className="text-[9px] text-[#4A4A5A] font-mono">{settings.paytm_upi_id || settings.upi_id}</span>
                </div>
              ) : paymentMethod === "razorpay" && (settings.razorpay_upi_id || settings.upi_id) ? (
                <div className="flex flex-col items-center gap-2 p-2 bg-[#141418] rounded border border-[#1E1E26]">
                  <QRCodeSVG
                    value={`upi://pay?pa=${settings.razorpay_upi_id || settings.upi_id}&pn=${encodeURIComponent(settings.store_name)}&am=${finalTotal}&cu=INR`}
                    size={80}
                  />
                  <span className="text-[9px] text-[#4A4A5A] font-mono">{settings.razorpay_upi_id || settings.upi_id}</span>
                </div>
              ) : null}

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={handlePrintKOT}
                  disabled={processing}
                  aria-label={t("pos.printKot")}
                  className="flex-1 py-2 text-[10px] font-bold uppercase bg-[#141418] border border-[#1E1E26] rounded hover:bg-[#1E1E26] transition-colors"
                >
                  {t("pos.kot")} <span className="text-[7px] opacity-50 ml-1">F9</span>
                </button>
                <button
                  onClick={handleHoldOrder}
                  disabled={processing}
                  aria-label={t("pos.holdForLater")}
                  className="flex-1 py-2 text-[10px] font-bold uppercase bg-[#141418] border border-[#1E1E26] rounded hover:bg-[#1E1E26] transition-colors"
                >
                  {t("pos.hold")} <span className="text-[7px] opacity-50 ml-1">F10</span>
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
                  title={t("pos.printProforma")}
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
                  aria-label={t("pos.charge", { currency: curr, amount: finalTotal.toFixed(2) })}
                  className="flex-[3] py-2 text-[11px] font-bold uppercase bg-[#F5C842] text-[#0D0D0F] rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  data-testid="checkout-button"
                  data-checkout-button
                >
                  {processing ? (
                    <RefreshCw size={12} className="spin" />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  {t("pos.chargeLabel", { currency: curr, amount: finalTotal.toFixed(2) })}
                  <span className="text-[8px] opacity-60 ml-1 font-mono">F12</span>
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
                <Package size={20} className="text-[#F5C842]" /> {t("pos.modals.addCustomItem")}
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-[#9090A8] mb-1 block">
                    {t("pos.modals.itemName")}
                  </label>
                  <input
                    autoFocus
                    placeholder={t("pos.modals.itemNamePlaceholder")}
                    className="w-full bg-[#141418] border-[#1E1E26] rounded-xl px-4 py-3"
                    value={customItem.name}
                    onChange={(e) =>
                      setCustomItem({ ...customItem, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9090A8] mb-1 block">
                    {t("pos.modals.itemPrice", { currency: curr })}
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
                  {t("common.cancel")}
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
                  {t("pos.modals.addToCart")}
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
                  {t("pos.modals.addAsReturn")}
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
                  <Package size={20} className="text-[#F5C842]" /> {t("pos.modals.selectBatch")}{" "}
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
                      {t("pos.modals.batchNumber")}{b.batch_number}
                    </div>
                    <div className="text-base font-bold mb-2">
                      {t("pos.modals.expires")} {b.expiry_date || t("pos.modals.noExpiry")}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[#F5C842] font-bold">
                        {t("pos.modals.qty")} {b.quantity}
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
                  {t("common.cancel")}
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
                  <Package size={20} className="text-[#F5C842]" /> {t("pos.modals.selectSerial")}{" "}
                  {serialSelection.product.name}
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
                      {t("pos.modals.serialNumber")}
                    </div>
                    <div className="text-base font-bold mb-2 font-mono">
                      {s.serial_number}
                    </div>
                    <div className="mt-auto text-[10px] text-green-500 font-bold uppercase tracking-wider">
                      {t("pos.modals.available")}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-[#141418] flex justify-end">
                <button
                  onClick={() => setSerialSelection(null)}
                  className="px-6 py-2 bg-[#1E1E26] text-white font-bold rounded-xl"
                >
                  {t("common.cancel")}
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
                <Split size={20} className="text-[#F5C842]" /> {t("pos.modals.splitPayment")}
              </h3>
              <p className="text-xs text-[#9090A8] mb-6">
                {t("pos.modals.splitPaymentDesc")}
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
                  <span className="text-[#9090A8]">{t("pos.modals.orderTotal")}</span>
                  <span className="font-bold text-white">
                    {curr}
                    {finalTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#9090A8]">{t("pos.modals.allocated")}</span>
                  <span className="font-bold text-[#F5C842]">
                    {curr}
                    {splitPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-[#1E1E26]">
                  <span className="text-[#9090A8]">{t("pos.modals.remaining")}</span>
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
                  {t("common.cancel")}
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
                  {t("pos.modals.confirmSplit")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Override Price Input Modal */}
        {showPinModal?.type === "price_override" && overridePrice === "" && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold mb-4">{t("pos.modals.enterNewPrice")}</h3>
              <input
                autoFocus
                type="number"
                placeholder={t("pos.modals.newPrice", { currency: curr })}
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
                  {t("common.cancel")}
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
                ? t("pos.modals.authorizeOverride")
                : showPinModal.type === "void"
                  ? t("pos.modals.authorizeVoid")
                  : t("pos.modals.authorizeNoSale")
            }
            description={t("pos.modals.managerPinRequired")}
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
                } catch (e) { }
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
                } catch (e) { }
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
                <Trash2 size={20} className="text-[#E74C3C]" /> {t("pos.modals.voidTransaction")}
              </h3>
              <p className="text-xs text-[#9090A8] mb-4">
                {t("pos.modals.voidReason")}
              </p>
              <textarea
                autoFocus
                placeholder={t("pos.modals.voidReasonPlaceholder")}
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
                  {t("common.cancel")}
                </button>
                <button
                  disabled={!voidReason.trim()}
                  onClick={handleVoidOrder}
                  className="flex-1 py-3 bg-[#E74C3C] text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {t("common.confirmVoid")}
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
                  <Package size={20} className="text-[#F5C842]" /> {t("pos.modals.selectVariant")}{" "}
                  {variantSelection.product.name}
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
                        {v.stock > 0 ? `${t("common.inStock")}: ${v.stock}` : t("common.outOfStock")}
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
                  {t("common.cancel")}
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
                  <FolderOpen size={20} className="text-[#F5C842]" /> {t("pos.modals.selectTable")}
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
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${tableId === t.id
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
                  {t("common.close")}
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
                  <Clock size={20} /> {t("pos.modals.heldOrders")}
                </h2>
                <button
                  onClick={() => setShowHeldOrders(false)}
                  className="btn-ghost py-1 px-3"
                  aria-label={t("common.close")}
                >
                  <X size={16} />
                </button>
              </div>

              {heldOrders.length === 0 ? (
                <div className="text-center py-8" style={{ color: "#4A4A5A" }}>
                  <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p>{t("pos.modals.noHeldOrders")}</p>
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
                          <span className="font-medium">{t("pos.modals.orderNumber", { number: idx + 1 })}</span>
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
                          {t("pos.modals.restore")}
                        </button>
                        <button
                          onClick={() => {
                            const rec = generateReceipt(order, settings, true);
                            setReceipt(rec);
                            setLastOrder(order);
                            setShowHeldOrders(false);
                          }}
                          className="py-1.5 px-3 rounded bg-[#141418] border border-[#1E1E26] text-[#F5C842] hover:bg-[#1E1E26] flex items-center justify-center"
                          title={t("pos.modals.printPaymentReceipt")}
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteHeldOrder(order.id)}
                          className="btn-danger py-1.5 px-3 text-xs font-bold uppercase"
                        >
                          {t("common.delete")}
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

      {/* Hidden QR Generator (High-res canvas for print) */}
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
                } catch (e) { }

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
                      {t("pos.receipt.scanToPayUpi")}
                    </div>
                    <div
                      className="p-3 bg-white border-2 border-black rounded-xl"
                      style={{ backgroundColor: "white" }}
                    >
                      <QRCodeSVG value={url} size={150} />
                    </div>
                    <div
                      className="text-[11pt] font-bold text-center"
                      style={{ color: "black" }}
                    >
                      {activeUpiId}
                    </div>
                    <div
                      className="text-[14pt] font-black text-center mt-1"
                      style={{ color: "black" }}
                    >
                      {t("pos.totalLabel")} {currValue}
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



      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(barcode) => {
          setLocalSearch(barcode);
          setSearchQuery(barcode);
          setShowBarcodeScanner(false);
        }}
      />

      {showGiftCardRedeem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="card p-6 w-full max-w-md">
            <h2 className="font-semibold text-base mb-4">{t("pos.modals.redeemGiftCard")}</h2>
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>{t("pos.modals.giftCardCode")}</label>
              <input
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                placeholder={t("pos.modals.giftCardCodePlaceholder")}
              />
            </div>
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>{t("pos.modals.redeemAmount")}</label>
              <input
                type="number"
                step="0.01"
                value={giftCardAmount}
                onChange={(e) => setGiftCardAmount(e.target.value)}
                placeholder={t("pos.modals.enterAmountPlaceholder")}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowGiftCardRedeem(false); setGiftCardCode(""); setGiftCardAmount(""); }} className="btn-ghost flex-1">{t("common.cancel")}</button>
              <button
                onClick={async () => {
                  const amount = parseFloat(giftCardAmount);
                  if (!giftCardCode || !amount) return;
                  try {
                    const result = await dbRedeemGiftCard(giftCardCode, amount, activeStoreId);
                    if (result.success) {
                      alert(`Redeemed ${curr}${amount}. Remaining balance: ${curr}${result.balance}`);
                      // Apply as discount or payment
                      setAppliedCoupon({
                        id: "gift_card",
                        store_id: activeStoreId,
                        code: giftCardCode,
                        discount_type: "fixed",
                        discount_value: amount,
                        min_order_amount: 0,
                        max_uses: 1,
                        used_count: 0,
                        valid_from: new Date().toISOString(),
                        valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        active: true,
                      });
                      setShowGiftCardRedeem(false);
                      setGiftCardCode("");
                      setGiftCardAmount("");
                    } else {
                      alert(t("common.error"));
                    }
                  } catch (err) {
                    alert(t("common.somethingWentWrong"));
                  }
                }}
                className="btn-accent flex-1"
                disabled={!giftCardCode || !giftCardAmount}
              >
                {t("pos.modals.redeem")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
