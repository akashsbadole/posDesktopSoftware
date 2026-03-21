import { create } from 'zustand';
import { Product, Order, OrderItem, calcCart } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'in_store' | 'online';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet';

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

interface CustomerInfo {
  id?: string;
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
  amountPaid: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  setOrderType: (type: OrderType) => void;
  setTable: (id: string | null, name: string | null) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  setNotes: (notes: string) => void;
  setGlobalDiscount: (discount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setAmountPaid: (amount: number) => void;
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
  amountPaid: 0,

  addItem: (product: Product, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity, discount: 0 }] };
    });
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    }));
  },

  updateItemDiscount: (productId: string, discount: number) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, discount: Math.max(0, Math.min(100, discount)) } : i
      ),
    }));
  },

  setOrderType: (orderType) => set({ orderType }),
  setTable: (tableId, tableName) => set({ tableId, tableName }),
  setCustomerInfo: (customerInfo) => set({ customerInfo }),
  setNotes: (notes) => set({ notes }),
  setGlobalDiscount: (globalDiscount) => set({ globalDiscount: Math.max(0, Math.min(100, globalDiscount)) }),
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
      amountPaid: 0,
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
      items: state.items.map((i): OrderItem => ({
        product_id: i.product.id,
        product_name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        discount: i.discount,
        tax: i.product.tax,
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
