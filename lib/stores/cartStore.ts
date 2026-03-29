import { create } from 'zustand';
import { Product, Order, OrderItem, calcCart } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { useSettingsStore } from './settingsStore';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type PaymentMethod = 'cash' | 'card' | 'upi';
export type PriceTier = 'retail' | 'wholesale';

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
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
  paymentMethod: PaymentMethod;
  priceTier: PriceTier;
  amountPaid: number;
  originalOrderId: string | null;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  setOrderType: (type: OrderType) => void;
  setTable: (id: string | null, name: string | null) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  setNotes: (notes: string) => void;
  setGlobalDiscount: (discount: number) => void;
  setPriceTier: (tier: PriceTier) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setAmountPaid: (amount: number) => void;
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
  paymentMethod: 'cash',
  priceTier: 'retail',
  amountPaid: 0,
  originalOrderId: null,

  setOriginalOrderId: (id) => set({ originalOrderId: id }),

  addItem: (product: Product, quantity = 1) => {
    set((state) => {
      const tier = state.priceTier;
      let finalProduct = { ...product };

      // If we're in wholesale tier, use wholesale price
      if (tier === 'wholesale' && product.wholesale_price) {
        finalProduct.price = product.wholesale_price;
      }

      const existing = state.items.find((i) =>
        i.product.id === finalProduct.id &&
        JSON.stringify(i.product.metadata) === JSON.stringify(finalProduct.metadata) &&
        i.product.price === finalProduct.price &&
        i.product.name === finalProduct.name
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            (i.product.id === finalProduct.id && JSON.stringify(i.product.metadata) === JSON.stringify(finalProduct.metadata))
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        };
      }
      const cartItemId = uuid();
      return { items: [...state.items, { product: { ...finalProduct, cartItemId } as any, quantity, discount: 0 }] };
    });
  },

  removeItem: (cartItemId: string) => {
    set((state) => ({
      items: state.items.filter((i) => (i.product as any).cartItemId !== cartItemId),
    }));
  },

  updateQuantity: (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        (i.product as any).cartItemId === cartItemId ? { ...i, quantity } : i
      ),
    }));
  },

  updateItemDiscount: (cartItemId: string, discount: number) => {
    set((state) => ({
      items: state.items.map((i) =>
        (i.product as any).cartItemId === cartItemId ? { ...i, discount: Math.max(0, Math.min(100, discount)) } : i
      ),
    }));
  },

  setOrderType: (orderType) => set({ orderType }),
  setTable: (tableId, tableName) => set({ tableId, tableName }),
  setCustomerInfo: (customerInfo) => set({ customerInfo }),
  setNotes: (notes) => set({ notes }),
  setGlobalDiscount: (globalDiscount) => set({ globalDiscount: Math.max(0, Math.min(100, globalDiscount)) }),
  setPriceTier: (priceTier) => {
    const previousTier = get().priceTier;
    if (previousTier === priceTier) return;

    // Update all items in cart to match the new tier price
    set((state) => ({
      priceTier,
      items: state.items.map(item => {
        const product = item.product;
        let newPrice = product.price;
        if (priceTier === 'wholesale') {
          newPrice = product.wholesale_price || product.price;
        } else {
          // This is a bit tricky since we might have overridden the price
          // We'd need to fetch the original retail price or store both
          // For now, we'll assume product.price was the retail price
        }
        return { ...item, product: { ...product, price: newPrice } };
      })
    }));
  },
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),

  clearCart: () =>
    set({
      items: [],
      orderType: 'dine_in',
      tableId: null,
      tableName: null,
      customerInfo: null,
      notes: '',
      globalDiscount: 0,
      paymentMethod: 'cash',
      priceTier: 'retail',
      amountPaid: 0,
      originalOrderId: null,
    }),

  getSubtotal: () => calcCart(get().items, get().globalDiscount).subtotal,
  getTaxAmount: () => calcCart(get().items, get().globalDiscount).tax_amount,
  getDiscountAmount: () => calcCart(get().items, get().globalDiscount).discount_amount,
  getTotal: () => calcCart(get().items, get().globalDiscount).total,
  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  toOrder: (orderId, userId, userName) => {
    const state = get();
    const totals = calcCart(state.items, state.globalDiscount);
    return {
      id: orderId,
      store_id: useSettingsStore.getState().activeStoreId,
      items: state.items.map((i): OrderItem => ({
        product_id: i.product.id,
        product_name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        discount: i.discount,
        tax: i.product.tax,
        status: "pending" as const,
        done: false,
        metadata: i.product.metadata,
      })),
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      discount_amount: totals.discount_amount,
      total: totals.total,
      payment_method: state.paymentMethod,
      amount_paid: state.amountPaid,
      change_amount: state.amountPaid - totals.total,
      customer_name: state.customerInfo?.name || '',
      status: 'completed' as const,
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
