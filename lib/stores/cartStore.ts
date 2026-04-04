import { create } from 'zustand';
import { Product, Order, OrderItem, calcCart } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { useSettingsStore } from './settingsStore';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type PaymentMethod = 'cash' | 'card' | 'upi';
export type PriceTier = 'retail' | 'wholesale';

export interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  discount: number;
  discount_type: 'percentage' | 'fixed';
  override_price?: number;
  retail_price: number; // Keep track of original retail price for tier switching
}

export interface PaymentEntry {
  method: PaymentMethod | 'wallet';
  amount: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  address?: string;
}

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  tableId: string | null;
  tableName: string | null;
  customerInfo: CustomerInfo | null;
  notes: string;
  globalDiscount: number;
  globalDiscountType: 'percentage' | 'fixed';
  paymentMethod: PaymentMethod | 'split';
  priceTier: PriceTier;
  splitPayments: PaymentEntry[];
  amountPaid: number;
  tipAmount: number;
  originalOrderId: string | null;
  addItem: (product: Product, quantity?: number) => void;
  addCustomItem: (name: string, price: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemDiscount: (cartItemId: string, discount: number, type: 'percentage' | 'fixed') => void;
  overrideItemPrice: (cartItemId: string, price: number) => void;
  setOrderType: (type: OrderType) => void;
  setTable: (id: string | null, name: string | null) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  setNotes: (notes: string) => void;
  setPriceTier: (tier: PriceTier) => void;
  setGlobalDiscount: (discount: number, type?: 'percentage' | 'fixed') => void;
  setPaymentMethod: (method: PaymentMethod | 'split') => void;
  setSplitPayments: (payments: PaymentEntry[]) => void;
  setAmountPaid: (amount: number) => void;
  setTipAmount: (amount: number) => void;
  setOriginalOrderId: (id: string | null) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  toOrder: (orderId: string, userId: string, userName: string) => Order;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'dine_in',
  tableId: null,
  tableName: null,
  customerInfo: null,
  notes: '',
  globalDiscount: 0,
  globalDiscountType: 'percentage',
  paymentMethod: 'cash',
  priceTier: 'retail',
  splitPayments: [],
  amountPaid: 0,
  tipAmount: 0,
  originalOrderId: null,

  setOriginalOrderId: (id) => set({ originalOrderId: id }),

  addCustomItem: (name: string, price: number) => {
    const product: Product = {
      id: `custom-${uuid()}`,
      store_id: useSettingsStore.getState().activeStoreId || 'default',
      name,
      price,
      cost_price: 0,
      wholesale_price: price,
      category: 'Custom',
      subcategory: '',
      stock: 999,
      barcode: '',
      sku: 'CUSTOM',
      description: 'Custom added item',
      tax: 0,
      status: 'active',
      tags: '',
      is_digital: true,
      is_favorite: false,
      metadata: { is_custom: true }
    };
    get().addItem(product);
  },

  addItem: (product: Product, quantity = 1) => {
    set((state) => {
      const tier = state.priceTier;
      let finalProduct = { ...product };
      const retail_price = product.price;

      // If we're in wholesale tier, use wholesale price
      if (tier === 'wholesale' && product.wholesale_price) {
        finalProduct.price = product.wholesale_price;
      }

      // Consistent grouping criteria: id, metadata, price, and name
      const existing = state.items.find((i) =>
        i.product.id === finalProduct.id &&
        JSON.stringify(i.product.metadata) === JSON.stringify(finalProduct.metadata) &&
        i.product.price === finalProduct.price &&
        i.product.name === finalProduct.name &&
        !i.override_price // Don't group if price was overridden
      );

      if (existing) {
        return {
          items: state.items.map((i) =>
            (i.product.id === finalProduct.id &&
             JSON.stringify(i.product.metadata) === JSON.stringify(finalProduct.metadata) &&
             i.product.price === finalProduct.price &&
             i.product.name === finalProduct.name &&
             !i.override_price)
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        };
      }
      const cartItemId = uuid();
      return {
        items: [
          ...state.items,
          {
            cartItemId,
            product: finalProduct,
            quantity,
            discount: 0,
            discount_type: 'percentage',
            retail_price
          }
        ]
      };
    });
  },

  removeItem: (cartItemId: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.cartItemId !== cartItemId),
    }));
  },

  updateQuantity: (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.cartItemId === cartItemId ? { ...i, quantity } : i
      ),
    }));
  },

  updateItemDiscount: (cartItemId: string, discount: number, type: 'percentage' | 'fixed') => {
    set((state) => ({
      items: state.items.map((i) =>
        i.cartItemId === cartItemId ? {
          ...i,
          discount: type === 'percentage' ? Math.max(0, Math.min(100, discount)) : Math.max(0, discount),
          discount_type: type
        } : i
      ),
    }));
  },

  overrideItemPrice: (cartItemId, price) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.cartItemId === cartItemId ? { ...i, override_price: price } : i
      ),
    }));
  },

  setOrderType: (orderType) => set({ orderType }),
  setTable: (tableId, tableName) => set({ tableId, tableName }),
  setCustomerInfo: (customerInfo) => set({ customerInfo }),
  setNotes: (notes) => set({ notes }),
  setGlobalDiscount: (globalDiscount, type) => set((state) => ({
    globalDiscount: (type || state.globalDiscountType) === 'percentage' ? Math.max(0, Math.min(100, globalDiscount)) : Math.max(0, globalDiscount),
    globalDiscountType: type || state.globalDiscountType
  })),
  setPriceTier: (priceTier) => {
    const previousTier = get().priceTier;
    if (previousTier === priceTier) return;

    // Update all items in cart to match the new tier price
    set((state) => ({
      priceTier,
      items: state.items.map(item => {
        const product = item.product;
        let newPrice = item.retail_price;
        if (priceTier === 'wholesale') {
          newPrice = product.wholesale_price || item.retail_price;
        }
        // When switching tiers, we clear override_price to match the tier price
        return {
          ...item,
          product: { ...product, price: newPrice },
          override_price: undefined
        };
      })
    }));
  },
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setSplitPayments: (splitPayments) => set({ splitPayments }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),
  setTipAmount: (tipAmount) => set({ tipAmount }),

  clearCart: () =>
    set({
      items: [],
      orderType: 'dine_in',
      tableId: null,
      tableName: null,
      customerInfo: null,
      notes: '',
      globalDiscount: 0,
      globalDiscountType: 'percentage',
      paymentMethod: 'cash',
      priceTier: 'retail',
      splitPayments: [],
      amountPaid: 0,
      tipAmount: 0,
      originalOrderId: null,
    }),

  getSubtotal: () => calcCart(get().items, get().globalDiscount, get().globalDiscountType).subtotal,
  getTaxAmount: () => calcCart(get().items, get().globalDiscount, get().globalDiscountType).tax_amount,
  getDiscountAmount: () => calcCart(get().items, get().globalDiscount, get().globalDiscountType).discount_amount,
  getTotal: () => calcCart(get().items, get().globalDiscount, get().globalDiscountType).total + get().tipAmount,
  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  toOrder: (orderId, userId, userName) => {
    const state = get();
    const totals = calcCart(state.items, state.globalDiscount, state.globalDiscountType);
    const finalTotal = totals.total + state.tipAmount;
    return {
      id: orderId,
      store_id: useSettingsStore.getState().activeStoreId,
      items: state.items.map((i): OrderItem => ({
        product_id: i.product.id,
        product_name: i.product.name,
        price: i.override_price !== undefined ? i.override_price : i.product.price,
        quantity: i.quantity,
        discount: i.discount,
        discount_type: i.discount_type,
        tax: i.product.tax,
        status: "pending" as const,
        done: false,
        metadata: i.product.metadata,
      })),
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      discount_amount: totals.discount_amount,
      total: finalTotal,
      payment_method: state.paymentMethod === 'split' ? 'card' : state.paymentMethod, // simplified for DB
      amount_paid: state.amountPaid,
      change_amount: Math.max(0, state.amountPaid - finalTotal),
      customer_name: state.customerInfo?.name || '',
      status: 'completed' as const,
      tip_amount: state.tipAmount,
      discount_type: state.globalDiscountType,
      metadata: state.paymentMethod === 'split' ? { split_payments: state.splitPayments } : undefined,
      order_type: state.orderType,
      delivery_status: 'pending' as const,
      delivery_address: state.customerInfo?.address || '',
      delivery_phone: state.customerInfo?.phone || '',
      created_at: new Date().toISOString(),
      synced: false,
      table_id: state.tableId || undefined,
      notes: state.notes || undefined,
      user_id: userId,
      user_name: userName,
    };
  },
}));
